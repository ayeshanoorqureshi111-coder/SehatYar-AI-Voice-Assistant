import { useRef, useState } from "react";


function App() {

  // =====================================================
  // LOGIN STATES
  // =====================================================

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [token, setToken] = useState(
    localStorage.getItem("access_token") || ""
  );

  // =====================================================
  // VOICE STATES
  // =====================================================

  const [isRecording, setIsRecording] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [text, setText] = useState("");

  const [response, setResponse] = useState("");

  const [error, setError] = useState("");

  // =====================================================
  // RECORDING REFERENCES
  // =====================================================

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  // =====================================================
  // SPEAK AI RESPONSE
  // =====================================================

  const speakResponse = (message) => {

    if (!message) {
      return;
    }

    // Check browser support
    if (!("speechSynthesis" in window)) {

      setError(
        "Your browser does not support text-to-speech."
      );

      return;
    }

    // Stop previous speech
    window.speechSynthesis.cancel();

    // Create speech
    const speech =
      new SpeechSynthesisUtterance(message);

    // Voice settings
    speech.lang = "en-US";

    speech.rate = 0.95;

    speech.pitch = 1;

    speech.volume = 1;

    // Speak
    window.speechSynthesis.speak(speech);
  };


  // =====================================================
  // STOP AI VOICE
  // =====================================================

  const stopSpeaking = () => {

    if ("speechSynthesis" in window) {

      window.speechSynthesis.cancel();

    }
  };


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");

    setIsLoading(true);

    try {

      // FastAPI OAuth2 requires form data
      const formData = new URLSearchParams();

      formData.append(
        "username",
        email
      );

      formData.append(
        "password",
        password
      );

      // Login request
      const res = await fetch(
        "http://127.0.0.1:8000/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body: formData.toString(),
        }
      );

      const data = await res.json();

      // Check response
      if (!res.ok) {

        throw new Error(
          data.detail ||
          "Login failed."
        );

      }

      // Save token
      localStorage.setItem(
        "access_token",
        data.access_token
      );

      setToken(
        data.access_token
      );

      setError("");

      setEmail("");

      setPassword("");

    } catch (err) {

      setError(
        err.message ||
        "Login failed."
      );

    } finally {

      setIsLoading(false);

    }
  };


  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {

    // Stop speech
    stopSpeaking();

    // Stop recording if active
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {

      mediaRecorderRef.current.stop();

    }

    // Remove token
    localStorage.removeItem(
      "access_token"
    );

    setToken("");

    // Clear states
    setText("");

    setResponse("");

    setError("");

    setIsRecording(false);

  };


  // =====================================================
  // START RECORDING
  // =====================================================

  const startRecording = async () => {

    setError("");

    setText("");

    setResponse("");

    // Stop any previous speech
    stopSpeaking();

    try {

      // Ask microphone permission
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: {
              echoCancellation: true,

              noiseSuppression: true,

              autoGainControl: true,

              channelCount: 1,
            },
          }
        );

      // =================================================
      // CHOOSE AUDIO MIME TYPE
      // =================================================

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {

        mimeType =
          "audio/webm;codecs=opus";

      } else if (
        MediaRecorder.isTypeSupported(
          "audio/webm"
        )
      ) {

        mimeType =
          "audio/webm";

      } else if (
        MediaRecorder.isTypeSupported(
          "audio/ogg;codecs=opus"
        )
      ) {

        mimeType =
          "audio/ogg;codecs=opus";

      }


      // =================================================
      // CREATE MEDIA RECORDER
      // =================================================

      const recorder =
        mimeType
          ? new MediaRecorder(
              stream,
              { mimeType }
            )
          : new MediaRecorder(stream);


      mediaRecorderRef.current =
        recorder;

      audioChunksRef.current = [];


      // =================================================
      // WHEN AUDIO DATA ARRIVES
      // =================================================

      recorder.ondataavailable = (
        event
      ) => {

        if (
          event.data &&
          event.data.size > 0
        ) {

          audioChunksRef.current.push(
            event.data
          );

        }

      };


      // =================================================
      // WHEN RECORDING STOPS
      // =================================================

      recorder.onstop = async () => {

        // Stop microphone tracks
        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );


        // Create audio blob
        const audioBlob =
          new Blob(
            audioChunksRef.current,
            {
              type:
                mimeType ||
                "audio/webm",
            }
          );


        // Send audio to backend
        await sendAudioToBackend(
          audioBlob
        );

      };


      // =================================================
      // START
      // =================================================

      recorder.start();

      setIsRecording(true);

    } catch (err) {

      console.error(
        "Microphone error:",
        err
      );

      setError(
        "Microphone permission was denied or microphone is not available."
      );

      setIsRecording(false);

    }

  };


  // =====================================================
  // STOP RECORDING
  // =====================================================

  const stopRecording = () => {

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        "inactive"
    ) {

      mediaRecorderRef.current.stop();

      setIsRecording(false);

    }

  };


  // =====================================================
  // SEND AUDIO TO FASTAPI
  // =====================================================

  const sendAudioToBackend =
    async (audioBlob) => {

      setIsLoading(true);

      setError("");

      try {

        // =================================================
        // CREATE FORM DATA
        // =================================================

        const formData =
          new FormData();

        formData.append(
          "file",
          audioBlob,
          "voice.webm"
        );


        // =================================================
        // SEND REQUEST
        // =================================================

        const res =
          await fetch(
            "http://127.0.0.1:8000/voice/transcribe",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },

              body: formData,
            }
          );


        // =================================================
        // READ RESPONSE
        // =================================================

        const data =
          await res.json();


        // =================================================
        // ERROR CHECK
        // =================================================

        if (!res.ok) {

          throw new Error(
            data.detail ||
            "Backend request failed."
          );

        }


        // =================================================
        // USER TRANSCRIPTION
        // =================================================

        setText(
          data.text || ""
        );


        // =================================================
        // AI RESPONSE
        // =================================================

        const aiResponse =
          data.response ||
          "I received your message, but no AI response was returned.";


        setResponse(
          aiResponse
        );


        // =================================================
        // SPEAK AI RESPONSE
        // =================================================

        speakResponse(
          aiResponse
        );


      } catch (err) {

        console.error(
          "Voice request error:",
          err
        );

        setError(
          err.message ||
          "Something went wrong."
        );

      } finally {

        setIsLoading(false);

      }

    };


  // =====================================================
  // LOGIN SCREEN
  // =====================================================

  if (!token) {

    return (

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#f4f7fb",
          fontFamily: "Arial, sans-serif",
          padding: "20px",
        }}
      >

        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            background: "white",
            padding: "35px",
            borderRadius: "16px",
            boxShadow:
              "0 8px 30px rgba(0,0,0,0.10)",
          }}
        >

          <h1
            style={{
              textAlign: "center",
              marginBottom: "8px",
              color: "#1f2937",
            }}
          >
            SehatYar
          </h1>


          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              marginBottom: "30px",
            }}
          >
            AI Voice Assistant
          </p>


          <form
            onSubmit={handleLogin}
          >

            {/* EMAIL */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              Email
            </label>


            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "20px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontSize: "15px",
              }}
            />


            {/* PASSWORD */}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "bold",
              }}
            >
              Password
            </label>


            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter your password"
              required
              style={{
                width: "100%",
                padding: "12px",
                marginBottom: "20px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "8px",
                boxSizing: "border-box",
                fontSize: "15px",
              }}
            />


            {/* ERROR */}

            {error && (

              <div
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>

            )}


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "13px",
                border: "none",
                borderRadius: "8px",
                background: "#2563eb",
                color: "white",
                fontSize: "16px",
                fontWeight: "bold",
                cursor:
                  isLoading
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isLoading ? 0.7 : 1,
              }}
            >

              {isLoading
                ? "Logging in..."
                : "Login"}

            </button>

          </form>

        </div>

      </div>

    );

  }


  // =====================================================
  // MAIN VOICE ASSISTANT SCREEN
  // =====================================================

  return (

    <div
      style={{
        minHeight: "100vh",
        background: "#f4f7fb",
        fontFamily: "Arial, sans-serif",
        padding: "30px 20px",
        boxSizing: "border-box",
      }}
    >

      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "20px 25px",
            marginBottom: "20px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
          }}
        >

          <div>

            <h1
              style={{
                margin: 0,
                color: "#1f2937",
              }}
            >
              🩺 SehatYar
            </h1>

            <p
              style={{
                margin:
                  "5px 0 0 0",
                color: "#6b7280",
              }}
            >
              AI Voice Assistant
            </p>

          </div>


          <button
            onClick={handleLogout}
            style={{
              padding:
                "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: "#dc2626",
              color: "white",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Logout
          </button>

        </div>


        {/* =================================================
            MAIN CARD
        ================================================= */}

        <div
          style={{
            background: "white",
            borderRadius: "16px",
            padding: "35px",
            boxShadow:
              "0 5px 20px rgba(0,0,0,0.08)",
          }}
        >

          {/* =================================================
              INSTRUCTION
          ================================================= */}

          <div
            style={{
              textAlign: "center",
              marginBottom: "30px",
            }}
          >

            <h2
              style={{
                color: "#1f2937",
                marginBottom: "10px",
              }}
            >
              Talk to SehatYar
            </h2>

            <p
              style={{
                color: "#6b7280",
              }}
            >
              Speak naturally and ask about doctors,
              appointments, or your SehatYar account.
            </p>

          </div>


          {/* =================================================
              MICROPHONE BUTTON
          ================================================= */}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "15px",
            }}
          >

            <button
              onClick={
                isRecording
                  ? stopRecording
                  : startRecording
              }
              disabled={isLoading}
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                border: "none",
                background:
                  isRecording
                    ? "#dc2626"
                    : "#2563eb",
                color: "white",
                fontSize: "42px",
                cursor:
                  isLoading
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isLoading ? 0.6 : 1,
                boxShadow:
                  "0 8px 20px rgba(0,0,0,0.15)",
              }}
            >

              {isRecording
                ? "⏹"
                : "🎤"}

            </button>

          </div>


          {/* =================================================
              RECORDING STATUS
          ================================================= */}

          <div
            style={{
              textAlign: "center",
              marginBottom: "25px",
              color:
                isRecording
                  ? "#dc2626"
                  : "#6b7280",
              fontWeight: "bold",
            }}
          >

            {isRecording
              ? "Recording... Click to stop"
              : isLoading
              ? "Processing your request..."
              : "Click the microphone and speak"}

          </div>


          {/* =================================================
              STOP SPEAKING BUTTON
          ================================================= */}

          {response && (

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "25px",
              }}
            >

              <button
                onClick={stopSpeaking}
                style={{
                  padding:
                    "10px 18px",
                  border:
                    "1px solid #9ca3af",
                  borderRadius: "8px",
                  background: "white",
                  color: "#374151",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                🔇 Stop Speaking
              </button>

            </div>

          )}


          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          {error && (

            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "14px",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>

          )}


          {/* =================================================
              USER SAID
          ================================================= */}

          {text && (

            <div
              style={{
                background: "#eff6ff",
                padding: "20px",
                borderRadius: "12px",
                marginBottom: "20px",
                border:
                  "1px solid #bfdbfe",
              }}
            >

              <h3
                style={{
                  marginTop: 0,
                  color: "#1d4ed8",
                }}
              >
                🎤 You said
              </h3>

              <p
                style={{
                  marginBottom: 0,
                  color: "#1f2937",
                  lineHeight: "1.6",
                }}
              >
                {text}
              </p>

            </div>

          )}


          {/* =================================================
              AI RESPONSE
          ================================================= */}

          {response && (

            <div
              style={{
                background: "#f0fdf4",
                padding: "20px",
                borderRadius: "12px",
                border:
                  "1px solid #bbf7d0",
              }}
            >

              <h3
                style={{
                  marginTop: 0,
                  color: "#15803d",
                }}
              >
                🤖 SehatYar AI
              </h3>

              <p
                style={{
                  marginBottom: 0,
                  color: "#1f2937",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                }}
              >
                {response}
              </p>

            </div>

          )}

        </div>


        {/* =================================================
            FOOTER
        ================================================= */}

        <p
          style={{
            textAlign: "center",
            color: "#9ca3af",
            marginTop: "20px",
            fontSize: "13px",
          }}
        >
          SehatYar AI Voice Assistant
        </p>

      </div>

    </div>

  );

}


export default App;