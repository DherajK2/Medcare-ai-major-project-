try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.jobstores.memory import MemoryJobStore
    jobstores = {"default": MemoryJobStore()}
    scheduler = AsyncIOScheduler(jobstores=jobstores, timezone="UTC")
except ImportError:
    class DummyScheduler:
        def start(self): pass
        def shutdown(self, wait=False): pass
        def add_job(self, *args, **kwargs): pass
    scheduler = DummyScheduler()
