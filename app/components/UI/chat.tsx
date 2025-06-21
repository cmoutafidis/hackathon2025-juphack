"use client";
import React, { useState } from "react";
import { Send, Mic, TrendingUp, Loader2, Sun, Moon } from "lucide-react";

// Define message type for type safety
type MessageType = {
  id: number;
  text?: string;
  sender: string;
  type?: string;
  timestamp: Date;
};

export default function ChatbotUI() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [swapPrice, setSwapPrice] = useState("$127.45");
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      const newMessage = {
        id: Date.now(),
        text: inputMessage,
        sender: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);

      setTimeout(() => {
        const botResponse = {
          id: Date.now() + 1,
          text: "Here's the current market data for your request:",
          sender: "bot",
          type: "text",
          timestamp: new Date(),
        };

        const tradingWidget = {
          id: Date.now() + 2,
          sender: "bot",
          type: "trading",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botResponse, tradingWidget]);
      }, 1000);

      setInputMessage("");
    }
  };
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const handleBuy = () => {
    setShowLoadingPopup(true);
    setTimeout(() => {
      setShowLoadingPopup(false);
      const successMessage = {
        id: Date.now(),
        text: "Transaction completed successfully!",
        sender: "bot",
        type: "text",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    }, 3000);
  };

  const handleSwap = () => {
    console.log("Swap clicked");
  };

  const handleVoiceInput = () => {
    console.log("Voice input clicked");
  };
const i=0;  const renderMessage = (message: MessageType) => {
    if (message.type === "trading") {
      return (
        <div key={message.id} className="flex justify-start mb-4 px-4">
          <div
            className={`rounded-2xl p-4 w-full max-w-md border-2 shadow-lg ${
              darkMode
                ? "bg-gray-800 border-gray-600 shadow-gray-900/30"
                : "bg-white border-blue-200 shadow-blue-200/40"
            }`}
          >
            {/* Price Graph Section */}
            <div className="mb-3">
              <div
                className="flex items-center justify-between mb-2 p-2 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(100, 153, 118, 0.1)"
                    : "rgba(96, 165, 250, 0.08)",
                }}
              >
                <h3
                  className={`font-semibold text-sm ${
                    darkMode ? "text-gray-200" : "text-blue-700"
                  }`}
                  style={{
                    color: darkMode ? "#a4ca6f" : "#1d4ed8",
                  }}
                >
                  PRICE GRAPH
                </h3>
                <TrendingUp
                  className="w-4 h-4"
                  style={{
                    color: darkMode ? "#649976" : "#22c55e",
                  }}
                />
              </div>

              <div
                className={`h-24 rounded-lg border-2 flex items-center justify-center mb-3 ${
                  darkMode ? "bg-gray-900" : "bg-white"
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    darkMode ? "text-gray-400" : "text-blue-500"
                  }`}
                  style={{
                    color: darkMode ? "#26bdd8" : "#3b82f6",
                  }}
                >
                  Chart Area
                </span>
              </div>

              <div
                className="text-center mb-3 p-3 rounded-lg"
                style={{
                  backgroundColor: darkMode
                    ? "rgba(38, 189, 216, 0.1)"
                    : "rgba(34, 197, 94, 0.08)",
                }}
              >
                <div
                  className={`text-xs mb-1 font-bold ${
                    darkMode ? "text-gray-300" : "text-emerald-700"
                  }`}
                  style={{
                    color: darkMode ? "#26bdd8" : "#059669",
                  }}
                >
                  SWAP PRICE
                </div>
                <div
                  className={`text-xl font-bold pb-1 inline-block border-b-2 ${
                    darkMode ? "text-gray-200" : "text-emerald-800"
                  }`}
                  style={{
                    borderColor: darkMode ? "#a4ca6f" : "#22c55e",
                    color: darkMode ? "#a4ca6f" : "#166534",
                  }}
                >
                  {swapPrice}
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleBuy}
                  className="px-6 py-2.5 text-white rounded-lg hover:scale-105 transition-all font-semibold text-sm shadow-lg border-2 border-transparent hover:border-white/20"
                  style={{
                    backgroundColor: darkMode ? "#649976" : "#22c55e",
                  }}
                >
                  Buy
                </button>
                <button
                  onClick={handleSwap}
                  className="px-6 py-2.5 text-white rounded-lg hover:scale-105 transition-all font-semibold text-sm shadow-lg border-2 border-transparent hover:border-white/20"
                  style={{
                    backgroundColor: darkMode ? "#26bdd8" : "#3b82f6",
                  }}
                >
                  Swap
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex mb-4 px-4 ${
          message.sender === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`w-fit max-w-lg px-4 py-3 rounded-2xl text-sm border-2 shadow-lg ${
            message.sender === "user"
              ? "text-white"
              : darkMode
              ? "bg-gray-800 text-gray-200"
              : "bg-white text-gray-800"
          }`}
          style={{
            backgroundColor:
              message.sender === "user"
                ? darkMode
                  ? "#26bdd8"
                  : "#3b82f6"
                : undefined,
            borderColor: darkMode ? "#649976" : "#60a5fa",
          }}
        >
          {message.text}
        </div>
      </div>
    );
  };
  return (
    <div
      className={`w-full h-full min-h-screen p-0 overflow-hidden transition-all duration-500 ${
        darkMode
          ? "bg-gray-900"
          : "bg-gradient-to-br from-blue-50 via-white to-emerald-50"
      }`}
    >
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleTheme}
          className={`w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-lg ${
            darkMode
              ? "bg-gray-800 border-gray-600"
              : "bg-white border-blue-200"
          }`}
        >
          {darkMode ? (
            <Sun className="w-6 h-6" style={{ color: "#a4ca6f" }} />
          ) : (
            <Moon className="w-6 h-6" style={{ color: "#3b82f6" }} />
          )}
        </button>
      </div>

      <div
        className={`w-full h-full flex flex-col ${
          darkMode ? "bg-gray-800" : "bg-white"
        }`}
      >
        {/* Chat Header */}
        <div className="h-16 border-b flex items-center px-6 text-lg font-bold"
          style={{
            borderColor: darkMode ? "#26bdd8" : "#60a5fa",
            color: darkMode ? "#a4ca6f" : "#2563eb"
          }}
        >
          Chatbot
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div
                className={`p-6 rounded-2xl border-2 ${
                  darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-blue-200"
                }`}
              >
                <p
                  className={`text-sm font-semibold ${
                    darkMode ? "text-gray-300" : "text-blue-700"
                  }`}
                >
                  Hi, I am (name of the app)
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => renderMessage(msg))
          )}
        </div>

        {/* Loading Overlay */}
        {showLoadingPopup && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div
              className={`p-6 rounded-xl border-2 ${
                darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-blue-200"
              }`}
            >
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
              <p
                className={`text-center font-semibold ${
                  darkMode ? "text-gray-300" : "text-blue-700"
                }`}
              >
                Processing Transaction...
              </p>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t flex items-center gap-3"
          style={{
            borderColor: darkMode ? "#649976" : "#60a5fa"
          }}
        >
          <input
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className={`flex-1 px-4 py-3 rounded-full border-2 shadow-sm text-sm ${
              darkMode
                ? "bg-gray-700 text-white border-gray-600 placeholder-gray-400"
                : "bg-white text-black border-blue-200 placeholder-blue-400"
            }`}
          />
          <button
            onClick={handleSendMessage}
            className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
              darkMode
                ? "bg-gray-600 border-gray-500"
                : "bg-white border-blue-200"
            }`}
          >
            <Send
              className="w-4 h-4"
              style={{ color: darkMode ? "#649976" : "#3b82f6" }}
            />
          </button>
          <button
            onClick={handleVoiceInput}
            className={`w-11 h-11 rounded-full flex items-center justify-center border-2 shadow-md ${
              darkMode
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-emerald-200"
            }`}
          >
            <Mic
              className="w-5 h-5"
              style={{ color: darkMode ? "#a4ca6f" : "#16a34a" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
