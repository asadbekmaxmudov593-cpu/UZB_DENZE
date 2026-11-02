from aiogram import Router

from . import admin, agent, user


def setup_routers() -> Router:
    root = Router()
    # admin & agent first so their commands are not swallowed by user handlers
    root.include_routers(admin.router, agent.router, user.router)
    return root
