from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import os
import uuid
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv()

app = FastAPI(title="Mirror Play API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017/mirrorplay")
client = AsyncIOMotorClient(MONGO_URL)
db = client.mirrorplay

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
INTEGRATION_PROXY_URL = os.environ.get("INTEGRATION_PROXY_URL", "https://integrations.emergentagent.com")
EMERGENT_BASE_URL = f"{INTEGRATION_PROXY_URL}/openai/v1"

# ============ MODELS ============

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    avatar: str = "default"
    level: int = 1
    xp: int = 0
    coins: int = 100
    streak: int = 0
    last_practice: Optional[str] = None
    achievements: List[str] = []
    friends: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UserCreate(BaseModel):
    username: str
    email: str

class Scenario(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    difficulty: str  # beginner, intermediate, advanced
    context: str
    ai_role: str
    user_goal: str
    tags: List[str] = []
    is_community: bool = False
    author_id: Optional[str] = None
    rating: float = 0.0
    plays: int = 0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ScenarioCreate(BaseModel):
    title: str
    description: str
    category: str
    difficulty: str
    context: str
    ai_role: str
    user_goal: str
    tags: List[str] = []

class PracticeSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    scenario_id: str
    messages: List[Dict[str, Any]] = []
    analysis: Dict[str, Any] = {}
    duration: int = 0  # seconds
    xp_earned: int = 0
    completed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Message(BaseModel):
    role: str  # user, assistant
    content: str
    tone_analysis: Optional[Dict[str, Any]] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ChatRequest(BaseModel):
    session_id: str
    message: str
    user_id: str

class Community(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    members: List[str] = []
    challenges: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    likes: List[str] = []
    comments: List[Dict[str, Any]] = []
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Challenge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    scenario_id: str
    start_date: str
    end_date: str
    participants: List[Dict[str, Any]] = []  # {user_id, score}
    rewards: Dict[str, int] = {"xp": 100, "coins": 50}
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class Achievement(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    xp_reward: int
    requirement: Dict[str, Any]

class JournalEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    type: str  # voice, gratitude, reflection
    mood: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class DailyReward(BaseModel):
    day: int
    xp: int
    coins: int
    claimed: bool = False

# ============ BUILT-IN DATA ============

BUILT_IN_SCENARIOS = [
    {
        "id": "scenario-1",
        "title": "Difficult Conversation with Boss",
        "description": "Practice having a tough conversation about workload or expectations",
        "category": "workplace",
        "difficulty": "intermediate",
        "context": "You need to talk to your boss about feeling overwhelmed with your current workload. You want to set boundaries while maintaining a positive relationship.",
        "ai_role": "I am your manager. I'm generally supportive but very focused on meeting deadlines and team goals.",
        "user_goal": "Express your concerns about workload clearly and negotiate a sustainable solution",
        "tags": ["workplace", "boundaries", "assertiveness"],
        "rating": 4.5,
        "plays": 1520
    },
    {
        "id": "scenario-2",
        "title": "Setting Boundaries with Family",
        "description": "Practice expressing your needs to a family member",
        "category": "family",
        "difficulty": "advanced",
        "context": "Your parent has been giving unsolicited advice about your life choices. You want to maintain a loving relationship while establishing clear boundaries.",
        "ai_role": "I am your parent. I deeply care about you and sometimes express it by giving advice, even when not asked.",
        "user_goal": "Communicate your need for autonomy while showing appreciation for their care",
        "tags": ["family", "boundaries", "emotional"],
        "rating": 4.7,
        "plays": 2340
    },
    {
        "id": "scenario-3",
        "title": "First Date Conversation",
        "description": "Practice engaging and authentic conversation on a first date",
        "category": "dating",
        "difficulty": "beginner",
        "context": "You're on a first date at a coffee shop. You want to make a genuine connection while being yourself.",
        "ai_role": "I'm your date. I'm friendly, curious, and looking for authentic connection.",
        "user_goal": "Have an engaging conversation, ask meaningful questions, and share about yourself authentically",
        "tags": ["dating", "social", "connection"],
        "rating": 4.3,
        "plays": 3100
    },
    {
        "id": "scenario-4",
        "title": "Apologizing Sincerely",
        "description": "Practice delivering a heartfelt apology",
        "category": "relationships",
        "difficulty": "intermediate",
        "context": "You forgot an important event for your close friend/partner and need to apologize sincerely.",
        "ai_role": "I'm your close friend/partner. I'm hurt by what happened but open to hearing you out.",
        "user_goal": "Deliver a genuine apology, take responsibility, and express how you'll do better",
        "tags": ["apology", "emotional", "relationships"],
        "rating": 4.6,
        "plays": 1890
    },
    {
        "id": "scenario-5",
        "title": "Job Interview Preparation",
        "description": "Practice answering tough interview questions",
        "category": "career",
        "difficulty": "beginner",
        "context": "You're in a job interview for your dream position. The interviewer will ask challenging questions.",
        "ai_role": "I'm a professional interviewer. I'll ask both standard and challenging questions to assess your fit.",
        "user_goal": "Answer questions confidently, showcase your strengths, and handle difficult questions gracefully",
        "tags": ["career", "interview", "professional"],
        "rating": 4.8,
        "plays": 4200
    },
    {
        "id": "scenario-6",
        "title": "Conflict Resolution with Roommate",
        "description": "Address issues with a roommate constructively",
        "category": "living",
        "difficulty": "intermediate",
        "context": "Your roommate hasn't been doing their share of household chores. You need to address this without damaging the relationship.",
        "ai_role": "I'm your roommate. I might not realize there's an issue or might get defensive initially.",
        "user_goal": "Communicate the issue clearly and work toward a fair solution together",
        "tags": ["conflict", "living", "communication"],
        "rating": 4.4,
        "plays": 1650
    },
    {
        "id": "scenario-7",
        "title": "Asking for a Raise",
        "description": "Negotiate your salary with confidence",
        "category": "career",
        "difficulty": "advanced",
        "context": "You've been performing well and believe you deserve a raise. Time to have that conversation with your manager.",
        "ai_role": "I'm your manager. I appreciate good work but also have budget constraints to consider.",
        "user_goal": "Present your case confidently, provide evidence of your value, and negotiate effectively",
        "tags": ["career", "negotiation", "assertiveness"],
        "rating": 4.5,
        "plays": 2100
    },
    {
        "id": "scenario-8",
        "title": "Supporting a Friend in Crisis",
        "description": "Practice active listening and emotional support",
        "category": "friendship",
        "difficulty": "intermediate",
        "context": "Your close friend is going through a difficult time and needs someone to talk to.",
        "ai_role": "I'm your friend going through a tough time. I need someone to listen without immediately trying to fix things.",
        "user_goal": "Practice active listening, show empathy, and provide emotional support",
        "tags": ["empathy", "listening", "support"],
        "rating": 4.9,
        "plays": 2800
    }
]

ACHIEVEMENTS = [
    {"id": "first-practice", "name": "First Steps", "description": "Complete your first practice session", "icon": "🎯", "xp_reward": 50, "requirement": {"sessions": 1}},
    {"id": "streak-7", "name": "Week Warrior", "description": "Maintain a 7-day streak", "icon": "🔥", "xp_reward": 200, "requirement": {"streak": 7}},
    {"id": "streak-30", "name": "Monthly Master", "description": "Maintain a 30-day streak", "icon": "⭐", "xp_reward": 500, "requirement": {"streak": 30}},
    {"id": "scenario-10", "name": "Explorer", "description": "Try 10 different scenarios", "icon": "🗺️", "xp_reward": 150, "requirement": {"unique_scenarios": 10}},
    {"id": "level-5", "name": "Rising Star", "description": "Reach level 5", "icon": "✨", "xp_reward": 100, "requirement": {"level": 5}},
    {"id": "level-10", "name": "Communication Pro", "description": "Reach level 10", "icon": "🏆", "xp_reward": 300, "requirement": {"level": 10}},
    {"id": "social-5", "name": "Social Butterfly", "description": "Add 5 friends", "icon": "🦋", "xp_reward": 100, "requirement": {"friends": 5}},
    {"id": "journal-7", "name": "Reflective Mind", "description": "Write 7 journal entries", "icon": "📝", "xp_reward": 150, "requirement": {"journal_entries": 7}},
    {"id": "challenge-win", "name": "Champion", "description": "Win a weekly challenge", "icon": "🥇", "xp_reward": 250, "requirement": {"challenge_wins": 1}},
    {"id": "empathy-master", "name": "Empathy Master", "description": "Score 90%+ on empathy in 5 sessions", "icon": "💖", "xp_reward": 300, "requirement": {"high_empathy_sessions": 5}}
]

DAILY_PROMPTS = [
    {"focus": "Active Listening", "prompt": "Practice reflecting back what someone says before responding"},
    {"focus": "Empathy", "prompt": "Try to understand the other person's perspective before sharing yours"},
    {"focus": "Assertiveness", "prompt": "Use 'I' statements to express your needs clearly"},
    {"focus": "Tone Awareness", "prompt": "Pay attention to your tone - aim for warm but clear"},
    {"focus": "Pausing", "prompt": "Take a breath before responding to difficult statements"},
    {"focus": "Curiosity", "prompt": "Ask open-ended questions to understand more deeply"},
    {"focus": "Validation", "prompt": "Acknowledge the other person's feelings before problem-solving"}
]

# ============ HELPER FUNCTIONS ============

async def call_llm(messages: List[Dict], system_prompt: str = "") -> str:
    """Call the LLM using Emergent API"""
    try:
        headers = {
            "Authorization": f"Bearer {EMERGENT_LLM_KEY}",
            "Content-Type": "application/json"
        }
        
        formatted_messages = []
        if system_prompt:
            formatted_messages.append({"role": "system", "content": system_prompt})
        formatted_messages.extend(messages)
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": formatted_messages,
            "max_tokens": 1000,
            "temperature": 0.8
        }
        
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            response = await http_client.post(
                f"{EMERGENT_BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"LLM Error: {e}")
        return "I'm having trouble responding right now. Let's continue our conversation."

async def analyze_tone(text: str) -> Dict[str, Any]:
    """Analyze the tone and emotional content of text"""
    try:
        prompt = f"""Analyze the following text for emotional tone and communication style. 
Return a JSON object with these scores (0-100):
- empathy: how empathetic/understanding the message is
- assertiveness: how clear and confident the message is
- warmth: how friendly and approachable the tone is
- clarity: how clear and well-structured the message is
- emotional_awareness: how emotionally intelligent the response is
- overall_score: weighted average of all scores
- feedback: one brief sentence of constructive feedback
- dominant_emotion: the main emotion detected (calm, anxious, confident, frustrated, empathetic, etc.)

Text to analyze: "{text}"

Respond ONLY with valid JSON, no markdown."""
        
        headers = {
            "Authorization": f"Bearer {EMERGENT_LLM_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 500,
            "temperature": 0.3
        }
        
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                f"{EMERGENT_BASE_URL}/chat/completions",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            # Clean up potential markdown
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content)
    except Exception as e:
        print(f"Tone analysis error: {e}")
        return {
            "empathy": 70,
            "assertiveness": 70,
            "warmth": 70,
            "clarity": 70,
            "emotional_awareness": 70,
            "overall_score": 70,
            "feedback": "Keep practicing!",
            "dominant_emotion": "calm"
        }

def calculate_level(xp: int) -> int:
    """Calculate level from XP (100 XP per level, increasing)"""
    level = 1
    xp_needed = 100
    total_xp = 0
    while total_xp + xp_needed <= xp:
        total_xp += xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.2)
    return level

def calculate_xp_for_session(analysis: Dict) -> int:
    """Calculate XP earned from a practice session"""
    base_xp = 20
    if analysis.get("overall_score", 0) >= 80:
        base_xp += 30
    elif analysis.get("overall_score", 0) >= 60:
        base_xp += 15
    return base_xp

# ============ API ENDPOINTS ============

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "Mirror Play API"}

# User endpoints
@app.post("/api/users")
async def create_user(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        return {"id": existing["id"], **{k: v for k, v in existing.items() if k != "_id"}}
    
    user = User(username=user_data.username, email=user_data.email)
    await db.users.insert_one(user.dict())
    return user.dict()

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.pop("_id", None)
    return user

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, updates: Dict[str, Any]):
    allowed_fields = ["username", "avatar", "xp", "coins", "streak", "last_practice", "achievements", "friends", "level"]
    filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if "xp" in filtered_updates:
        filtered_updates["level"] = calculate_level(filtered_updates["xp"])
    
    await db.users.update_one({"id": user_id}, {"$set": filtered_updates})
    user = await db.users.find_one({"id": user_id})
    user.pop("_id", None)
    return user

@app.post("/api/users/{user_id}/claim-daily")
async def claim_daily_reward(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    today = datetime.utcnow().date().isoformat()
    last_claim = user.get("last_daily_claim", "")
    
    if last_claim == today:
        return {"success": False, "message": "Already claimed today"}
    
    # Calculate streak
    streak = user.get("daily_streak", 0)
    yesterday = (datetime.utcnow().date() - timedelta(days=1)).isoformat()
    
    if last_claim == yesterday:
        streak += 1
    else:
        streak = 1
    
    # Calculate rewards based on streak
    base_xp = 25
    base_coins = 10
    multiplier = min(streak, 7)  # Max 7x multiplier
    
    xp_reward = base_xp * multiplier
    coin_reward = base_coins * multiplier
    
    new_xp = user.get("xp", 0) + xp_reward
    new_coins = user.get("coins", 0) + coin_reward
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "last_daily_claim": today,
            "daily_streak": streak,
            "xp": new_xp,
            "coins": new_coins,
            "level": calculate_level(new_xp)
        }}
    )
    
    return {
        "success": True,
        "xp_earned": xp_reward,
        "coins_earned": coin_reward,
        "streak": streak,
        "multiplier": multiplier
    }

@app.get("/api/users/{user_id}/stats")
async def get_user_stats(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get session stats
    sessions = await db.sessions.find({"user_id": user_id}).to_list(100)
    total_sessions = len(sessions)
    total_duration = sum(s.get("duration", 0) for s in sessions)
    avg_score = 0
    if sessions:
        scores = [s.get("analysis", {}).get("overall_score", 0) for s in sessions if s.get("analysis")]
        avg_score = sum(scores) / len(scores) if scores else 0
    
    return {
        "total_sessions": total_sessions,
        "total_practice_minutes": total_duration // 60,
        "average_score": round(avg_score, 1),
        "streak": user.get("streak", 0),
        "daily_streak": user.get("daily_streak", 0),
        "achievements_count": len(user.get("achievements", [])),
        "level": user.get("level", 1),
        "xp": user.get("xp", 0)
    }

# Scenario endpoints
@app.get("/api/scenarios")
async def get_scenarios(category: Optional[str] = None, difficulty: Optional[str] = None):
    # Combine built-in and community scenarios
    query = {}
    if category:
        query["category"] = category
    if difficulty:
        query["difficulty"] = difficulty
    
    community_scenarios = await db.scenarios.find(query).to_list(100)
    for s in community_scenarios:
        s.pop("_id", None)
    
    # Filter built-in scenarios
    filtered_builtin = BUILT_IN_SCENARIOS
    if category:
        filtered_builtin = [s for s in filtered_builtin if s["category"] == category]
    if difficulty:
        filtered_builtin = [s for s in filtered_builtin if s["difficulty"] == difficulty]
    
    return filtered_builtin + community_scenarios

@app.get("/api/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    # Check built-in first
    for s in BUILT_IN_SCENARIOS:
        if s["id"] == scenario_id:
            return s
    
    scenario = await db.scenarios.find_one({"id": scenario_id})
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenario.pop("_id", None)
    return scenario

@app.post("/api/scenarios")
async def create_scenario(scenario_data: ScenarioCreate, user_id: str):
    scenario = Scenario(
        **scenario_data.dict(),
        is_community=True,
        author_id=user_id
    )
    await db.scenarios.insert_one(scenario.dict())
    return scenario.dict()

@app.post("/api/scenarios/{scenario_id}/rate")
async def rate_scenario(scenario_id: str, rating: float):
    # For built-in scenarios, we'd store ratings separately
    scenario = await db.scenarios.find_one({"id": scenario_id})
    if scenario:
        current_rating = scenario.get("rating", 0)
        plays = scenario.get("plays", 0)
        new_rating = ((current_rating * plays) + rating) / (plays + 1)
        await db.scenarios.update_one(
            {"id": scenario_id},
            {"$set": {"rating": round(new_rating, 1)}, "$inc": {"plays": 1}}
        )
    return {"success": True}

# Practice Session endpoints
@app.post("/api/sessions")
async def create_session(user_id: str, scenario_id: str):
    session = PracticeSession(user_id=user_id, scenario_id=scenario_id)
    await db.sessions.insert_one(session.dict())
    return session.dict()

@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.pop("_id", None)
    return session

@app.get("/api/users/{user_id}/sessions")
async def get_user_sessions(user_id: str, limit: int = 20):
    sessions = await db.sessions.find({"user_id": user_id}).sort("created_at", -1).to_list(limit)
    for s in sessions:
        s.pop("_id", None)
    return sessions

@app.post("/api/sessions/{session_id}/message")
async def add_message(session_id: str, request: ChatRequest):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get scenario for context
    scenario = None
    for s in BUILT_IN_SCENARIOS:
        if s["id"] == session["scenario_id"]:
            scenario = s
            break
    
    if not scenario:
        scenario = await db.scenarios.find_one({"id": session["scenario_id"]})
    
    # Analyze user's message tone
    tone_analysis = await analyze_tone(request.message)
    
    # Create user message
    user_message = {
        "role": "user",
        "content": request.message,
        "tone_analysis": tone_analysis,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Build conversation history for AI
    messages = [{"role": m["role"], "content": m["content"]} for m in session.get("messages", [])]
    messages.append({"role": "user", "content": request.message})
    
    # Create system prompt for AI role
    system_prompt = f"""You are participating in a role-play practice session for emotional intelligence training.

Scenario: {scenario.get('title', 'Practice Session')}
Context: {scenario.get('context', '')}
Your Role: {scenario.get('ai_role', 'A practice partner for communication skills')}
User's Goal: {scenario.get('user_goal', 'Practice effective communication')}

Guidelines:
- Stay in character as described in your role
- Respond naturally and realistically to what the user says
- If the user communicates well, respond positively but stay in character
- If the user struggles, give them something to work with, not a lecture
- Keep responses conversational, 2-4 sentences typically
- Never break character to give direct coaching
- React authentically to the emotional tone of what the user says"""
    
    # Get AI response
    ai_response = await call_llm(messages, system_prompt)
    
    # Create AI message
    ai_message = {
        "role": "assistant",
        "content": ai_response,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Update session
    await db.sessions.update_one(
        {"id": session_id},
        {"$push": {"messages": {"$each": [user_message, ai_message]}}}
    )
    
    return {
        "user_message": user_message,
        "ai_response": ai_message,
        "tone_analysis": tone_analysis
    }

@app.post("/api/sessions/{session_id}/complete")
async def complete_session(session_id: str, duration: int = 0):
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate overall analysis from all messages
    messages = session.get("messages", [])
    user_messages = [m for m in messages if m["role"] == "user"]
    
    if user_messages:
        avg_empathy = sum(m.get("tone_analysis", {}).get("empathy", 70) for m in user_messages) / len(user_messages)
        avg_assertiveness = sum(m.get("tone_analysis", {}).get("assertiveness", 70) for m in user_messages) / len(user_messages)
        avg_warmth = sum(m.get("tone_analysis", {}).get("warmth", 70) for m in user_messages) / len(user_messages)
        avg_clarity = sum(m.get("tone_analysis", {}).get("clarity", 70) for m in user_messages) / len(user_messages)
        overall = (avg_empathy + avg_assertiveness + avg_warmth + avg_clarity) / 4
        
        analysis = {
            "empathy": round(avg_empathy, 1),
            "assertiveness": round(avg_assertiveness, 1),
            "warmth": round(avg_warmth, 1),
            "clarity": round(avg_clarity, 1),
            "overall_score": round(overall, 1),
            "message_count": len(user_messages)
        }
    else:
        analysis = {"overall_score": 0, "message_count": 0}
    
    xp_earned = calculate_xp_for_session(analysis)
    
    # Update session
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {
            "completed": True,
            "duration": duration,
            "analysis": analysis,
            "xp_earned": xp_earned
        }}
    )
    
    # Update user XP and streak
    user = await db.users.find_one({"id": session["user_id"]})
    if user:
        new_xp = user.get("xp", 0) + xp_earned
        today = datetime.utcnow().date().isoformat()
        last_practice = user.get("last_practice", "")
        
        streak = user.get("streak", 0)
        yesterday = (datetime.utcnow().date() - timedelta(days=1)).isoformat()
        
        if last_practice != today:
            if last_practice == yesterday:
                streak += 1
            elif last_practice != today:
                streak = 1
        
        await db.users.update_one(
            {"id": session["user_id"]},
            {"$set": {
                "xp": new_xp,
                "level": calculate_level(new_xp),
                "streak": streak,
                "last_practice": today
            }}
        )
    
    return {
        "analysis": analysis,
        "xp_earned": xp_earned,
        "session_id": session_id
    }

# Challenge endpoints
@app.get("/api/challenges")
async def get_challenges():
    challenges = await db.challenges.find().sort("created_at", -1).to_list(20)
    for c in challenges:
        c.pop("_id", None)
    return challenges

@app.get("/api/challenges/active")
async def get_active_challenges():
    now = datetime.utcnow().isoformat()
    challenges = await db.challenges.find({
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }).to_list(10)
    for c in challenges:
        c.pop("_id", None)
    return challenges

@app.post("/api/challenges")
async def create_challenge(title: str, description: str, scenario_id: str, duration_days: int = 7):
    start = datetime.utcnow()
    end = start + timedelta(days=duration_days)
    
    challenge = Challenge(
        title=title,
        description=description,
        scenario_id=scenario_id,
        start_date=start.isoformat(),
        end_date=end.isoformat()
    )
    await db.challenges.insert_one(challenge.dict())
    return challenge.dict()

@app.post("/api/challenges/{challenge_id}/join")
async def join_challenge(challenge_id: str, user_id: str):
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    # Check if already joined
    participants = challenge.get("participants", [])
    if any(p["user_id"] == user_id for p in participants):
        return {"success": True, "message": "Already joined"}
    
    await db.challenges.update_one(
        {"id": challenge_id},
        {"$push": {"participants": {"user_id": user_id, "score": 0, "sessions": 0}}}
    )
    return {"success": True}

@app.get("/api/challenges/{challenge_id}/leaderboard")
async def get_challenge_leaderboard(challenge_id: str):
    challenge = await db.challenges.find_one({"id": challenge_id})
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    
    participants = challenge.get("participants", [])
    # Sort by score descending
    sorted_participants = sorted(participants, key=lambda x: x.get("score", 0), reverse=True)
    
    # Enrich with user data
    leaderboard = []
    for i, p in enumerate(sorted_participants[:50]):
        user = await db.users.find_one({"id": p["user_id"]})
        if user:
            leaderboard.append({
                "rank": i + 1,
                "user_id": p["user_id"],
                "username": user.get("username", "Anonymous"),
                "avatar": user.get("avatar", "default"),
                "score": p.get("score", 0),
                "sessions": p.get("sessions", 0)
            })
    
    return leaderboard

# Community/Social endpoints
@app.get("/api/posts")
async def get_posts(limit: int = 20):
    posts = await db.posts.find().sort("created_at", -1).to_list(limit)
    
    enriched_posts = []
    for p in posts:
        p.pop("_id", None)
        user = await db.users.find_one({"id": p["user_id"]})
        p["username"] = user.get("username", "Anonymous") if user else "Anonymous"
        p["user_avatar"] = user.get("avatar", "default") if user else "default"
        p["user_level"] = user.get("level", 1) if user else 1
        enriched_posts.append(p)
    
    return enriched_posts

@app.post("/api/posts")
async def create_post(user_id: str, content: str):
    post = Post(user_id=user_id, content=content)
    await db.posts.insert_one(post.dict())
    return post.dict()

@app.post("/api/posts/{post_id}/like")
async def like_post(post_id: str, user_id: str):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    likes = post.get("likes", [])
    if user_id in likes:
        await db.posts.update_one({"id": post_id}, {"$pull": {"likes": user_id}})
        return {"liked": False, "count": len(likes) - 1}
    else:
        await db.posts.update_one({"id": post_id}, {"$push": {"likes": user_id}})
        return {"liked": True, "count": len(likes) + 1}

@app.post("/api/posts/{post_id}/comment")
async def comment_post(post_id: str, user_id: str, content: str):
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "content": content,
        "created_at": datetime.utcnow().isoformat()
    }
    await db.posts.update_one({"id": post_id}, {"$push": {"comments": comment}})
    return comment

# Friends endpoints
@app.post("/api/users/{user_id}/friends/{friend_id}")
async def add_friend(user_id: str, friend_id: str):
    # Add to both users' friend lists
    await db.users.update_one({"id": user_id}, {"$addToSet": {"friends": friend_id}})
    await db.users.update_one({"id": friend_id}, {"$addToSet": {"friends": user_id}})
    return {"success": True}

@app.delete("/api/users/{user_id}/friends/{friend_id}")
async def remove_friend(user_id: str, friend_id: str):
    await db.users.update_one({"id": user_id}, {"$pull": {"friends": friend_id}})
    await db.users.update_one({"id": friend_id}, {"$pull": {"friends": user_id}})
    return {"success": True}

@app.get("/api/users/{user_id}/friends")
async def get_friends(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    friend_ids = user.get("friends", [])
    friends = []
    for fid in friend_ids:
        friend = await db.users.find_one({"id": fid})
        if friend:
            friends.append({
                "id": friend["id"],
                "username": friend.get("username"),
                "avatar": friend.get("avatar", "default"),
                "level": friend.get("level", 1),
                "streak": friend.get("streak", 0)
            })
    return friends

# Journal endpoints
@app.post("/api/journal")
async def create_journal_entry(user_id: str, content: str, entry_type: str = "reflection", mood: Optional[str] = None):
    entry = JournalEntry(
        user_id=user_id,
        content=content,
        type=entry_type,
        mood=mood
    )
    await db.journal.insert_one(entry.dict())
    return entry.dict()

@app.get("/api/journal/{user_id}")
async def get_journal_entries(user_id: str, limit: int = 20):
    entries = await db.journal.find({"user_id": user_id}).sort("created_at", -1).to_list(limit)
    for e in entries:
        e.pop("_id", None)
    return entries

# Achievements endpoint
@app.get("/api/achievements")
async def get_all_achievements():
    return ACHIEVEMENTS

@app.get("/api/users/{user_id}/achievements")
async def get_user_achievements(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_achievement_ids = user.get("achievements", [])
    unlocked = [a for a in ACHIEVEMENTS if a["id"] in user_achievement_ids]
    locked = [a for a in ACHIEVEMENTS if a["id"] not in user_achievement_ids]
    
    return {"unlocked": unlocked, "locked": locked}

# Daily prompt
@app.get("/api/daily-prompt")
async def get_daily_prompt():
    day_of_week = datetime.utcnow().weekday()
    return DAILY_PROMPTS[day_of_week % len(DAILY_PROMPTS)]

# Global leaderboard
@app.get("/api/leaderboard")
async def get_global_leaderboard(limit: int = 50):
    users = await db.users.find().sort("xp", -1).to_list(limit)
    leaderboard = []
    for i, u in enumerate(users):
        leaderboard.append({
            "rank": i + 1,
            "user_id": u["id"],
            "username": u.get("username", "Anonymous"),
            "avatar": u.get("avatar", "default"),
            "level": u.get("level", 1),
            "xp": u.get("xp", 0),
            "streak": u.get("streak", 0)
        })
    return leaderboard

# Marketplace items
@app.get("/api/marketplace")
async def get_marketplace_items():
    items = [
        {"id": "avatar-gold", "name": "Golden Aura", "type": "avatar", "price": 500, "description": "A prestigious golden avatar frame"},
        {"id": "avatar-crystal", "name": "Crystal Core", "type": "avatar", "price": 750, "description": "A shimmering crystal avatar effect"},
        {"id": "avatar-flame", "name": "Flame Spirit", "type": "avatar", "price": 600, "description": "Fiery animated avatar border"},
        {"id": "core-purple", "name": "Purple Nebula", "type": "core_color", "price": 300, "description": "Change your Mirror core to purple"},
        {"id": "core-green", "name": "Emerald Pulse", "type": "core_color", "price": 300, "description": "Change your Mirror core to green"},
        {"id": "core-rainbow", "name": "Rainbow Flow", "type": "core_color", "price": 1000, "description": "Animated rainbow core effect"},
        {"id": "badge-master", "name": "Master Badge", "type": "badge", "price": 400, "description": "Show off your expertise"},
        {"id": "boost-xp", "name": "XP Boost (24h)", "type": "boost", "price": 200, "description": "2x XP for 24 hours"}
    ]
    return items

@app.post("/api/marketplace/purchase")
async def purchase_item(user_id: str, item_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    items = await get_marketplace_items()
    item = next((i for i in items if i["id"] == item_id), None)
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if user.get("coins", 0) < item["price"]:
        raise HTTPException(status_code=400, detail="Not enough coins")
    
    # Deduct coins and add item to inventory
    await db.users.update_one(
        {"id": user_id},
        {
            "$inc": {"coins": -item["price"]},
            "$addToSet": {"inventory": item_id}
        }
    )
    
    return {"success": True, "item": item}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
