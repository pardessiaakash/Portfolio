import { useState } from "react";
import VideoFlow from "./VideoFlow";
import ChatbotUI from "./ChatbotUI";

// Remembered only for this page load: coming back from a project page goes
// straight to the lab, but a refresh starts again with the loader + intro.
let introSeenThisLoad = false;

const LandingPage = () => {
  const alreadySeen = introSeenThisLoad;
  const [chatbotOpen, setChatbotOpen] = useState(false);

  const handleIntroComplete = () => {
    introSeenThisLoad = true;
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
