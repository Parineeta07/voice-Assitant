import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Mic } from "lucide-react";

export default function App() {

  console.log(import.meta.env.VITE_GROQ_API_KEY);

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [risk, setRisk] = useState(0);

  const startListening = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();

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

Return:
- Threat Level
- Scam Type
- Warning
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
                  "You are a cybersecurity AI."
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

      setResponse(aiReply);

      let threatScore = 20;

      const lowerText =
        text.toLowerCase();

      if (
        lowerText.includes("otp") ||
        lowerText.includes("bank") ||
        lowerText.includes("password")
      ) {
        threatScore = 90;
      }

      if (
        lowerText.includes("urgent") ||
        lowerText.includes("immediately")
      ) {
        threatScore += 5;
      }

      setRisk(threatScore);

      speak(aiReply);

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

        onClick={startListening}

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