import { useState } from "react";
import VideoFlow from "./VideoFlow";
import ChatbotUI from "./ChatbotUI";

const LandingPage = () => {
  const alreadySeen = sessionStorage.getItem("introSeen") === "true";
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const handleIntroComplete = () => {
    sessionStorage.setItem("introSeen", "true");
  };

  return (
    <>
      <VideoFlow
        onComplete={handleIntroComplete}
        skipIntro={alreadySeen}
        onOpenChatbot={() => setChatbotOpen(true)}
      />
      {chatbotOpen && <ChatbotUI onClose={() => setChatbotOpen(false)} />}
    </>
  );
};

export default LandingPage;
