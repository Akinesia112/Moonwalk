from .agentbase import EvaluationAgent, UserAgent, EvaluationMessage, EvaluationResponse
from .assistant_agent import ReplyAgent
from autogen_core.models import ChatCompletionClient
from autogen_core import TypeSubscription, TopicId
from ..utils.io import read_prompt, read_prompt_list
from ..prompt.prompt_config import StylePrompt

# --- Topic type constants ---
USER_TOPIC = "user"
PROFESSIONAL_ARTIST_TOPIC = "professional_artist"
TRENDING_ARTIST_TOPIC = "trending_artist"
FANS_AGENT_TOPIC = "fans_agent"
DIRECTOR_TOPIC = "director"
JUNIOR_ARTIST_TOPIC = "junior_artist"
SENIOR_ARTIST_TOPIC = "senior_artist"
SUPERVISOR_TOPIC = "supervisor"

# --- Load prompts ---
professional_artist_prompt = read_prompt_list(StylePrompt.AGENT_PROFESSIONAL.value)
trending_artist_prompt     = read_prompt_list(StylePrompt.AGENT_TRENDING.value)
fans_agent_prompt          = read_prompt_list(StylePrompt.AGENT_FANS.value)
director_prompt            = read_prompt_list(StylePrompt.AGENT_DIRECTOR.value)
junior_artist_prompt       = read_prompt_list(StylePrompt.AGENT_JUNIOR_ARTIST.value)
senior_artist_prompt       = read_prompt_list(StylePrompt.AGENT_SENIOR_ARTIST.value)
supervisor_prompt          = read_prompt_list(StylePrompt.AGENT_SUPERVISOR.value)


async def _register_agent(runtime, topic_type: str, name: str, prompt, model_client):
    """Helper to register a single EvaluationAgent."""
    agent_type = await EvaluationAgent.register(
        runtime,
        type=topic_type,
        factory=lambda n=name, p=prompt, t=topic_type: EvaluationAgent(
            name=n,
            system_message=p,
            model_client=model_client,
            agent_topic_type=t,
            user_topic_type=USER_TOPIC,
        ),
    )
    await runtime.add_subscription(
        TypeSubscription(topic_type=topic_type, agent_type=agent_type.type)
    )
    print(f"Registered agent: {agent_type.type}")
    return agent_type


async def register_evaluation_agents(runtime, model_client: ChatCompletionClient):
    """
    Registers all evaluation agents and the reply agent with the runtime.
    """

    # 1. Professional Artist
    await _register_agent(runtime, PROFESSIONAL_ARTIST_TOPIC, "Professional_Artist", professional_artist_prompt, model_client)

    # 2. Trending Artist
    await _register_agent(runtime, TRENDING_ARTIST_TOPIC, "Trending_Artist", trending_artist_prompt, model_client)

    # 3. Fans Agent
    await _register_agent(runtime, FANS_AGENT_TOPIC, "Fans_Agent", fans_agent_prompt, model_client)

    # 4. Director
    await _register_agent(runtime, DIRECTOR_TOPIC, "Director", director_prompt, model_client)

    # 5. Junior Artist
    await _register_agent(runtime, JUNIOR_ARTIST_TOPIC, "Junior_Artist", junior_artist_prompt, model_client)

    # 6. Senior Artist
    await _register_agent(runtime, SENIOR_ARTIST_TOPIC, "Senior_Artist", senior_artist_prompt, model_client)

    # 7. Supervisor
    await _register_agent(runtime, SUPERVISOR_TOPIC, "Supervisor", supervisor_prompt, model_client)

    # 8. Reply Agent — collects all responses back to the API
    reply_agent_type = await ReplyAgent.register(
        runtime,
        type=USER_TOPIC,
        factory=lambda: ReplyAgent(description="A reply agent."),
    )
    await runtime.add_subscription(
        TypeSubscription(topic_type=USER_TOPIC, agent_type=reply_agent_type.type)
    )
    print(f"Registered agent: {reply_agent_type.type}")