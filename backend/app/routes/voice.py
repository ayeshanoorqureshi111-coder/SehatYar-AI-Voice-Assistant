from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Depends,
)

import whisper
import tempfile
import os

from app.models.user import User

from app.utils.jwt import (
    get_current_user,
    oauth2_scheme,
)

from app.agent import ask_agent


router = APIRouter(
    prefix="/voice",
    tags=["Voice Assistant"]
)


# =========================================================
# LOAD WHISPER SMALL MODEL
# =========================================================

model = whisper.load_model("small")


# =========================================================
# VOICE TRANSCRIPTION + AI RESPONSE
# =========================================================

@router.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),

    token: str = Depends(oauth2_scheme),

    current_user: User = Depends(get_current_user),
):

    temp_path = None

    try:

        # =====================================================
        # SAVE AUDIO FILE TEMPORARILY
        # =====================================================

        suffix = (
            os.path.splitext(
                file.filename or ""
            )[1]
            or ".webm"
        )

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as temp_file:

            audio_data = await file.read()

            if not audio_data:
                raise HTTPException(
                    status_code=400,
                    detail="No audio data received."
                )

            temp_file.write(audio_data)

            temp_path = temp_file.name


        # =====================================================
        # WHISPER SPEECH-TO-TEXT
        # =====================================================

        result = model.transcribe(
            temp_path,

            fp16=False,

            language=None,

            task="transcribe",

            temperature=0,

            best_of=5,

            beam_size=5,

            condition_on_previous_text=False,

            verbose=False,
        )


        text = result["text"].strip()


        if not text:

            raise HTTPException(
                status_code=400,
                detail="Could not understand the audio."
            )


        # =====================================================
        # LOGGED-IN USER INFORMATION
        # =====================================================

        user_context = {

            "user_id": current_user.id,

            "name": current_user.name,

            "email": current_user.email,
        }


        # =====================================================
        # MESSAGE FOR AGNO AI AGENT
        # =====================================================

        agent_message = f"""
You are assisting the currently logged-in SehatYar user.

Logged-in user information:

user_id: {current_user.id}

name: {current_user.name}

email: {current_user.email}


The user's spoken request was:

{text}


IMPORTANT SYSTEM RULES:

1. The logged-in user's user_id is:
   {current_user.id}

2. NEVER ask the user for their user_id.

3. Use user_id {current_user.id} automatically when:
   - checking appointments
   - booking appointments

4. If the user asks whether they have appointments,
   ALWAYS use get_my_appointments.

5. If the user asks to see their appointments,
   ALWAYS use get_my_appointments.

6. If the user asks about a doctor,
   ALWAYS use search_doctors.

7. If the user wants to book an appointment,
   use search_doctors to identify the doctor first.

8. NEVER ask the user for doctor_id.

9. doctor_id is an internal database identifier.

10. Obtain doctor_id from search_doctors.

11. Never invent doctor_id.

12. Never invent user_id.

13. Never invent doctor information.

14. Never invent appointment information.

15. If appointment date is missing,
    ask the user for the date.

16. If appointment time is missing,
    ask the user for the time.

17. Only book the appointment when all required
    information is available.

18. Give a short, clear, friendly final answer.
"""


        # =====================================================
        # SEND REQUEST TO AGNO AGENT
        # =====================================================

        response = ask_agent(agent_message)


        if response is None:

            response = (
                "I could not generate a response. "
                "Please try again."
            )


        response = str(response).strip()


        # =====================================================
        # RETURN RESPONSE
        # =====================================================

        return {

            "user_id": current_user.id,

            "language": result.get("language"),

            "text": text,

            "response": response,

            "user": user_context,

            "message": "Voice assistant request successful",
        }


    except HTTPException:

        raise


    except Exception as e:

        print(
            "VOICE ASSISTANT ERROR:",
            str(e)
        )

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


    finally:

        # =====================================================
        # DELETE TEMP AUDIO FILE
        # =====================================================

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            os.remove(temp_path)
