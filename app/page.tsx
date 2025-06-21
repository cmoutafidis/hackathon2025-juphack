import Image from "next/image";
import Voice from "./components/Voice";
import ChatbotUI from "./components/UI/chat";

export default function Home() {
  return (
    // Use either Voice or ChatbotUI but not both on the same page as they both try to take over the screen
    <div>
      <Voice />
      {/* Uncomment to switch to ChatbotUI */}
      {/* <ChatbotUI /> */}
    </div>
  );
}
