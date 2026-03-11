from __future__ import annotations
from autogen_core import RoutedAgent, message_handler, MessageContext
from .agentbase import EvaluationResponse
from .. import shared


class ReplyAgent(RoutedAgent):
    def __init__(self, description: str):
        super().__init__(description=description)

    @message_handler
    async def handle_reply(
        self, message: EvaluationResponse, ctx: MessageContext
    ) -> None:
        session_id = message.session_id
        if session_id in shared.response_queues:
            await shared.response_queues[session_id].put(message)