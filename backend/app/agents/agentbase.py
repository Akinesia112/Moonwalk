from __future__ import annotations
from dataclasses import dataclass
from autogen_core import RoutedAgent, message_handler, TopicId, MessageContext
from autogen_core.models import ChatCompletionClient, SystemMessage, UserMessage
from typing import List
from .. import shared


@dataclass
class EvaluationMessage:
    content: str
    session_id: str


@dataclass
class EvaluationResponse:
    agent_name: str
    content: str
    session_id: str


class EvaluationAgent(RoutedAgent):
    def __init__(
        self,
        name: str,
        system_message: str | List[str],
        model_client: ChatCompletionClient,
        agent_topic_type: str,
        user_topic_type: str,
    ):
        super().__init__(description=f"{name} evaluation agent")
        self._name = name
        self._model_client = model_client
        self._agent_topic_type = agent_topic_type
        self._user_topic_type = user_topic_type

        # Support both single string and list of strings
        if isinstance(system_message, list):
            system_content = "\n".join(system_message)
        else:
            system_content = system_message
        self._system_message = SystemMessage(content=system_content)

    @message_handler
    async def handle_evaluation(
        self, message: EvaluationMessage, ctx: MessageContext
    ) -> None:
        messages = [
            self._system_message,
            UserMessage(content=message.content, source="user"),
        ]
        response = await self._model_client.create(messages)
        reply_text = response.content

        await self.publish_message(
            EvaluationResponse(
                agent_name=self._name,
                content=reply_text,
                session_id=message.session_id,
            ),
            topic_id=TopicId(type=self._user_topic_type, source=self.id.key),
        )


class UserAgent(RoutedAgent):
    def __init__(
        self,
        description: str,
        user_topic_type: str,
        agent_topic_types: List[str],
    ):
        super().__init__(description=description)
        self._user_topic_type = user_topic_type
        self._agent_topic_types = agent_topic_types

    @message_handler
    async def handle_response(
        self, message: EvaluationResponse, ctx: MessageContext
    ) -> None:
        import shared
        session_id = message.session_id
        if session_id in shared.response_queues:
            await shared.response_queues[session_id].put(message)