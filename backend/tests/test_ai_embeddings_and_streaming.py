"""
DocuFlow AI — Tests for Dense Embeddings, Hybrid RAG, and SSE Streaming
"""
import pytest
import math
from app.services.ai.ai_provider import (
    compute_dense_embedding,
    cosine_similarity,
    MockAIProvider,
    ai_provider,
)
from app.models.core import DocumentChunk
from app.api.ai import retrieve_top_chunks


def test_compute_dense_embedding_and_cosine_similarity():
    """Verify deterministic unit normalization and semantic cosine similarity."""
    v1 = compute_dense_embedding("Order ID LD20260724 total amount ₹276.44 paid")
    v2 = compute_dense_embedding("What is the order ID and grand total paid?")
    v3 = compute_dense_embedding("Unrelated astronomy galaxy telescope telescope universe")

    # Dimensions check
    assert len(v1) == 256
    assert len(v2) == 256
    assert len(v3) == 256

    # Unit norm check
    norm1 = math.sqrt(sum(x * x for x in v1))
    assert math.isclose(norm1, 1.0, rel_tol=1e-3)

    # Self-similarity should be 1.0
    self_sim = cosine_similarity(v1, v1)
    assert math.isclose(self_sim, 1.0, rel_tol=1e-3)

    # Relevant similarity vs unrelated similarity
    sim_relevant = cosine_similarity(v1, v2)
    sim_unrelated = cosine_similarity(v1, v3)

    assert sim_relevant > sim_unrelated
    assert sim_relevant > 0.25


@pytest.mark.asyncio
async def test_ai_provider_streaming():
    """Verify summarize_stream and answer_question_stream yield tokens."""
    provider = MockAIProvider()

    # Summarize stream
    text = "The quick brown fox jumps over the lazy dog. Important financial report for Q4 2026 revenue was 5 million dollars."
    summary_tokens = []
    async for token in provider.summarize_stream(text, style="short"):
        summary_tokens.append(token)

    full_summary = "".join(summary_tokens)
    assert len(summary_tokens) > 1
    assert len(full_summary) > 20

    # Answer question stream
    chunks = [
        "Order ID: LD20260724-00123. Customer Name: Bharath G. Total amount: ₹276.44.",
        "Delivery Partner Name: Bhanuchandar Routh (ID: DP784512)."
    ]
    answer_tokens = []
    async for token in provider.answer_question_stream("Who is the customer?", chunks):
        answer_tokens.append(token)

    full_answer = "".join(answer_tokens)
    assert len(answer_tokens) > 1
    assert "Bharath G" in full_answer


@pytest.mark.asyncio
async def test_hybrid_rag_retrieval():
    """Verify hybrid RAG ranks the most semantically and lexically relevant chunk first."""
    import json

    c1 = DocumentChunk(
        id="c1",
        file_id="f1",
        chunk_index=0,
        content="General terms and privacy policy of the application and usage guidelines.",
        page_number=1,
        embedding_json=json.dumps(compute_dense_embedding("General terms and privacy policy")),
    )
    c2 = DocumentChunk(
        id="c2",
        file_id="f1",
        chunk_index=1,
        content="Order ID LD20260724-00123 Customer: Bharath G Total Amount Paid: ₹276.44 Mode: UPI",
        page_number=2,
        embedding_json=json.dumps(compute_dense_embedding("Order ID LD20260724 Customer Bharath G Total Amount Paid")),
    )
    c3 = DocumentChunk(
        id="c3",
        file_id="f1",
        chunk_index=2,
        content="Delivery partner guidelines and road vehicle safety standards.",
        page_number=3,
        embedding_json=json.dumps(compute_dense_embedding("Delivery partner guidelines and road vehicle")),
    )

    chunks = [c1, c2, c3]
    top_chunks = await retrieve_top_chunks(chunks, "What was the total amount paid by Bharath?", top_k=1)

    assert len(top_chunks) == 1
    assert top_chunks[0].id == "c2"
    assert top_chunks[0].page_number == 2
