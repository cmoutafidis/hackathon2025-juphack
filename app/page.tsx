import Image from "next/image";
import Voice from "./components/Voice";
import ChatbotUI from "./components/UI/chat";

export default function Home() {
  return (
   <div>
    <Voice/>
    <ChatbotUI/>
   </div>  );
}
