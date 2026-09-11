"""DocuFlow AI — AI tasks worker stub"""
from app.workers.celery_app import celery_app

@celery_app.task(bind=True, name="ai.dummy")
def ai_dummy_task(self):
    pass
