import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Mic } from "lucide-react";

export default function App() {

  console.log(import.meta.env.VITE_GROQ_API_KEY);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [risk, setRisk] = useState(0);
  const recognitionRef = useRef(null);

  const toggleListening = () => {

    if (listening) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      setListening(false);
      window.speechSynthesis.cancel(); // Stop the AI from speaking
      return;
    }

    window.speechSynthesis.cancel(); // Clear any ongoing speech before starting

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.lang = "en-US";

    recognition.start();

    setListening(true);

    recognition.onresult = async (event) => {

      const text =
        event.results[0][0].transcript;

      setTranscript(text);

      await analyzeScam(text);
    };

    recognition.onend = () => {
      setListening(false);
    };
  };

  const analyzeScam = async (text) => {

    const prompt = `
Analyze this message for phishing/scam behavior.

Message:
"${text}"

Return your response in this exact format:
[SCORE: X]
Threat Level: ...
Scam Type: ...
Warning: ...

Where X is a number from 0 to 100 representing the threat percentage. 
CRITICAL: If the message asks for or mentions an OTP, password, PIN, or bank details, you MUST return a high score (e.g., [SCORE: 90]).
If the message is completely safe, benign, or just a normal greeting (like "hi", "hello", or introducing a name), you MUST return [SCORE: 0]. Only give a score above 0 if there is a genuine risk.
`;

    try {

      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization:
              `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          },

          body: JSON.stringify({

            model: "llama-3.1-8b-instant",

            messages: [
              {
                role: "system",
                content:
                  "You are a cybersecurity AI. Always provide a threat score between 0 and 100."
              },

              {
                role: "user",
                content: prompt
              }
            ]
          }),
        }
      );

      const data = await res.json();

      console.log(data);

      if (!res.ok) {

        setResponse(
          data?.error?.message ||
          "API Error"
        );

        return;
      }

      const aiReply =
        data?.choices?.[0]?.message?.content ||
        "Threat detected.";

      // Parse the score from the AI reply
      const scoreMatch = aiReply.match(/\[SCORE:\s*(\d+)\]/i);
      let threatScore = 0; // Starts at 0

      if (scoreMatch && scoreMatch[1]) {
        threatScore = parseInt(scoreMatch[1], 10);
      }

      // Keyword overrides (guaranteed minimum score for dangerous words)
      const lowerText = text.toLowerCase();
      if (
        lowerText.includes("otp") ||
        lowerText.includes("bank") ||
        lowerText.includes("password") ||
        lowerText.includes("pin")
      ) {
        threatScore = Math.max(threatScore, 90);
      } else if (
        lowerText.includes("urgent") ||
        lowerText.includes("immediately")
      ) {
        threatScore = Math.max(threatScore, 40);
      }

      // Remove the [SCORE: X] part from the text shown/spoken to the user
      const cleanReply = aiReply.replace(/\[SCORE:\s*\d+\]\n*/i, "").trim();

      setResponse(cleanReply);
      setRisk(threatScore);

      speak(cleanReply);

    } catch (err) {

      console.log(err);

      setResponse(
        "Something went wrong."
      );
    }
  };
  const speak = (text) => {

    const speech =
      new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";

    speech.rate = 1;

    window.speechSynthesis.speak(speech);
  };

  return (

    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">

      <motion.div

        animate={{
          scale: listening
            ? [1, 1.15, 1]
            : 1
        }}

        transition={{
          repeat: Infinity,
          duration: 1
        }}

        className={`
          w-40 h-40
          rounded-full
          flex items-center justify-center
          shadow-2xl
          transition-all
          duration-300
          ${risk > 70
            ? "bg-red-600"
            : "bg-blue-600"}
        `}
      >
        <ShieldAlert size={80} />
      </motion.div>

      <h1 className="text-5xl font-bold mt-8">
        CipherVoice AI
      </h1>

      <p className="text-gray-400 mt-3 text-center">
        Real-Time Cybersecurity Voice Defense
      </p>

      <button

        onClick={toggleListening}

        className="
          mt-8
          px-6 py-4
          bg-purple-600
          hover:bg-purple-700
          rounded-2xl
          flex items-center gap-3
          text-xl
          transition
        "
      >
        <Mic />

        {listening
          ? "Listening..."
          : "Start Secure Call"}
      </button>

      <div className="mt-10 w-full max-w-2xl grid gap-4">

        <div className="bg-zinc-900 p-5 rounded-2xl">

          <h2 className="text-2xl font-bold mb-3">
            Live Transcript
          </h2>

          <p className="text-gray-300">
            {transcript ||
              "Waiting for speech..."}
          </p>

        </div>

        <div className="bg-zinc-900 p-5 rounded-2xl">

          <h2 className="text-2xl font-bold mb-3">
            Threat Analysis
          </h2>

          <p className="text-gray-300 whitespace-pre-line">
            {response ||
              "No threat detected yet."}
          </p>

        </div>

        <div className="bg-zinc-900 p-5 rounded-2xl">

          <h2 className="text-2xl font-bold mb-3">
            Threat Score
          </h2>

          <p className="text-5xl font-bold text-red-500">
            {risk}%
          </p>

        </div>

      </div>

    </div>
  );
}