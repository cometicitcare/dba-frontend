// app/(auth)/login/page.tsx
"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { UserIcon, LockIcon, AlertCircle, Eye, EyeOff } from "lucide-react";
import { BodhiLeafBackground } from "@/components/BodhiLeafBackground";
import { _login } from "@/services/auth"; // integrates old API

/** Why: the old API typing is loose; we locally narrow for safety without changing the service. */
type User = Record<string, unknown>;
type LoginSuccess = { status: number; data: { user: User } };
type LoginErrorShape = { response?: { data?: { detail?: string } } };

/** Why: precise runtime check that also narrows TypeScript type. */
function hasUser(resp: unknown): resp is LoginSuccess {
  return (
    typeof resp === "object" &&
    resp !== null &&
    // @ts-expect-error: runtime checks before narrowing
    typeof resp.status === "number" &&
    // @ts-expect-error: runtime checks before narrowing
    resp.status === 200 &&
    // @ts-expect-error: runtime checks before narrowing
    typeof resp.data === "object" &&
    // @ts-expect-error: runtime checks before narrowing
    resp.data !== null &&
    // @ts-expect-error: runtime checks before narrowing
    "user" in resp.data
  );
}

export default function Login() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // NOTE: kept invisible to preserve UI; used for control/logging only.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [useBodhiLeaves, setUseBodhiLeaves] = useState(true); // Toggle between diamond and leaves
  const [showChatbot, setShowChatbot] = useState(false); // Chatbot popup state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      text: "Hi! I'm your HRMS Assistant. How can I help you today?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Bot responses for common queries
  const getBotResponse = (userMessage: string) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes("password") || message.includes("forgot")) {
      return "To reset your password, please contact the IT department at +94-11-xxx-xxxx or email support@dba.gov.lk. You'll need to provide your employee ID for verification.";
    }
    
    if (message.includes("account") || message.includes("register") || message.includes("sign up")) {
      return "New account registration requires approval from your department head and the IT administrator. Please submit a formal request through your supervisor.";
    }
    
    if (message.includes("login") || message.includes("access") || message.includes("enter")) {
      return "For login issues, ensure your credentials are correct. If you're still having trouble, please check with your system administrator or contact our support team.";
    }
    
    if (message.includes("support") || message.includes("help") || message.includes("contact")) {
      return "📞 Support Contact:\n• Phone: +94-11-xxx-xxxx\n• Email: support@dba.gov.lk\n• Office Hours: 8:00 AM - 4:30 PM\n• Emergency: Contact your department IT coordinator";
    }
    
    if (message.includes("working hours") || message.includes("office") || message.includes("time")) {
      return "Department of Buddhist Affairs office hours:\n• Monday to Friday: 8:00 AM - 4:30 PM\n• Lunch Break: 12:00 PM - 1:00 PM\n• Closed on weekends and public holidays";
    }
    
    if (message.includes("hello") || message.includes("hi") || message.includes("good")) {
      return "Hello! Welcome to the Department of Buddhist Affairs HRMS. I'm here to assist you with your queries. How can I help you today?";
    }
    
    // Default response
    return "Thank you for your message. For specific technical issues, please contact our support team at support@dba.gov.lk or call +94-11-xxx-xxxx during office hours (8:00 AM - 4:30 PM).";
  };

  // Handle sending messages
  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: currentMessage,
      sender: "user" as const,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsTyping(true);

    // Simulate bot typing delay
    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        text: getBotResponse(currentMessage),
        sender: "bot" as const,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    const messagesContainer = document.querySelector('.chat-messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [chatMessages]);
  
  // Sri Lankan Buddhist scenery images ONLY for login page background
  const sceneryImages = [
    "/login-backgrounds/damma-school.png",
    "/login-backgrounds/sripadaya-fe.png",
    "/login-backgrounds/kubalwela.png",
    "/login-backgrounds/monks.png",
    "/login-backgrounds/stupa.png",
    "/login-backgrounds/temple-of-tooth-relic.png"
  ];
  
  const [currentSceneryIndex, setCurrentSceneryIndex] = useState(0);
  const [loadedSceneryImages, setLoadedSceneryImages] = useState<string[]>([]);

  // Preload scenery images
  useEffect(() => {
    let isActive = true;
    const loadImage = (src: string) =>
      new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(src);
        img.onerror = () => reject(src);
        img.src = src;
      });

    (async () => {
      const successes: string[] = [];
      const failures: string[] = [];
      await Promise.allSettled(sceneryImages.map(loadImage)).then((results) => {
        results.forEach((r) => {
          if (r.status === "fulfilled") successes.push(r.value);
          else failures.push(r.reason);
        });
      });
      if (failures.length) {
        console.warn("[Login] Failed scenery images:", failures);
      }
      if (isActive) setLoadedSceneryImages(successes.length ? successes : []);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  // Rotate scenery images
  useEffect(() => {
    if (loadedSceneryImages.length <= 1) return;
    const id = setInterval(() => {
      setCurrentSceneryIndex((p) => (p + 1) % loadedSceneryImages.length);
    }, 8000); // Change every 8 seconds
    return () => clearInterval(id);
  }, [loadedSceneryImages.length]);

  const currentSceneryImage = useMemo(() => {
    if (!loadedSceneryImages.length) return null;
    return loadedSceneryImages[currentSceneryIndex % loadedSceneryImages.length];
  }, [loadedSceneryImages, currentSceneryIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // prevent double submit

    // Why: show an in-page, brand-colored error instead of alert()
    if (!username || !password) {
      setError("User name and password are required.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      // Map new UI fields to old API payload shape.
      const resp = await _login({
        ua_username: username,
        ua_password: password,
      });

      if (hasUser(resp)) {
        // Why: keep session contract consistent with old UI.
        console.log("datadatadata",resp?.data)
        localStorage.setItem("user", JSON.stringify(resp.data));
        router.push("/"); // redirect to home/dashboard, same as old UI
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      const detail =
        (err as LoginErrorShape)?.response?.data?.detail ||
        "Credentials are incorrect. Please try again.";
      setError(detail); // Why: surface server-provided detail where available
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 p-12 items-center justify-center relative overflow-hidden">
        {/* Toggle Button for Animation Style */}
        <button
          onClick={() => setUseBodhiLeaves(!useBodhiLeaves)}
          className="absolute top-4 right-4 z-20 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-3 py-1 text-sm text-white transition-colors"
        >
          {useBodhiLeaves ? '🔶 Switch to Diamonds' : '🍃 Switch to Bodhi Leaves'}
        </button>

        {/* Conditional Animated Background Elements */}
        {useBodhiLeaves ? (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Smaller Bodhi Leaf Shapes with bright green colors */}
            <div className="absolute top-16 left-16 w-4 h-4 text-green-400/30 animate-float-leaf">
              <BodhiLeafBackground />
            </div>
            <div className="absolute top-32 right-20 w-6 h-6 text-green-500/25 animate-float-leaf-sway">
              <BodhiLeafBackground />
            </div>
            <div className="absolute bottom-24 left-24 w-5 h-5 text-green-300/35 animate-float-leaf-slow">
              <BodhiLeafBackground />
            </div>
            <div className="absolute top-1/3 left-1/4 w-3 h-3 text-green-600/40 animate-float-leaf-spiral">
              <BodhiLeafBackground />
            </div>
            <div className="absolute bottom-1/3 right-1/5 w-7 h-7 text-green-400/28 animate-float-leaf">
              <BodhiLeafBackground />
            </div>
            <div className="absolute top-1/4 right-1/4 w-4 h-4 text-green-500/42 animate-float-leaf-sway">
              <BodhiLeafBackground />
            </div>
            <div className="absolute bottom-1/4 left-1/3 w-6 h-6 text-green-300/32 animate-float-leaf-slow">
              <BodhiLeafBackground />
            </div>
            <div className="absolute top-1/2 right-1/8 w-5 h-5 text-green-600/26 animate-float-leaf-spiral">
              <BodhiLeafBackground />
            </div>
            <div className="absolute top-2/3 left-1/6 w-4 h-4 text-green-400/38 animate-float-leaf">
              <BodhiLeafBackground />
            </div>
            <div className="absolute bottom-1/6 right-2/5 w-6 h-6 text-green-500/30 animate-float-leaf-sway">
              <BodhiLeafBackground />
            </div>
            <div className="absolute top-1/6 left-2/5 w-3 h-3 text-green-300/44 animate-float-leaf-slow">
              <BodhiLeafBackground />
            </div>
            <div className="absolute bottom-2/5 right-1/6 w-7 h-7 text-green-600/29 animate-float-leaf-spiral">
              <BodhiLeafBackground />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 pointer-events-none">
            {/* Evenly distributed Diamond shapes - smaller and well spaced */}
            
            {/* Row 1 - Top */}
            <div className="absolute top-16 left-12 w-8 h-8 bg-white/15 animate-float-diamond"></div>
            <div className="absolute top-20 left-1/3 w-10 h-10 bg-white/12 animate-float-horizontal"></div>
            <div className="absolute top-16 left-2/3 w-6 h-6 bg-white/18 animate-float-diagonal"></div>
            <div className="absolute top-24 right-12 w-9 h-9 bg-white/14 animate-float-pulse"></div>
            
            {/* Row 2 - Upper Middle */}
            <div className="absolute top-1/4 left-16 w-12 h-12 bg-white/11 animate-float-circular"></div>
            <div className="absolute top-1/4 left-1/2 w-7 h-7 bg-white/16 animate-float-horizontal-reverse"></div>
            <div className="absolute top-1/4 right-16 w-8 h-8 bg-white/13 animate-float-diagonal-reverse"></div>
            
            {/* Row 3 - Center */}
            <div className="absolute top-1/2 left-20 w-10 h-10 bg-white/14 animate-float-diamond-slow"></div>
            <div className="absolute top-1/2 left-1/3 w-6 h-6 bg-white/19 animate-float-pulse"></div>
            <div className="absolute top-1/2 left-2/3 w-11 h-11 bg-white/10 animate-float-circular"></div>
            <div className="absolute top-1/2 right-20 w-8 h-8 bg-white/15 animate-float-horizontal"></div>
            
            {/* Row 4 - Lower Middle */}
            <div className="absolute top-3/4 left-12 w-9 h-9 bg-white/13 animate-float-diagonal"></div>
            <div className="absolute top-3/4 left-1/2 w-7 h-7 bg-white/17 animate-float-horizontal-reverse"></div>
            <div className="absolute top-3/4 right-16 w-10 h-10 bg-white/12 animate-float-pulse"></div>
            
            {/* Row 5 - Bottom */}
            <div className="absolute bottom-16 left-16 w-8 h-8 bg-white/16 animate-float-diamond"></div>
            <div className="absolute bottom-20 left-1/3 w-6 h-6 bg-white/20 animate-float-circular"></div>
            <div className="absolute bottom-16 left-2/3 w-9 h-9 bg-white/13 animate-float-diagonal-reverse"></div>
            <div className="absolute bottom-24 right-12 w-7 h-7 bg-white/18 animate-float-horizontal"></div>
            
            {/* Additional scattered elements */}
            <div className="absolute top-1/8 left-1/4 w-5 h-5 bg-white/22 animate-float-pulse"></div>
            <div className="absolute top-3/8 right-1/4 w-8 h-8 bg-white/12 animate-float-circular"></div>
            <div className="absolute bottom-3/8 left-1/8 w-6 h-6 bg-white/17 animate-float-diagonal"></div>
            <div className="absolute bottom-1/8 right-1/3 w-9 h-9 bg-white/14 animate-float-horizontal-reverse"></div>
          </div>
        )}

        <div className="relative z-10 text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <img src="/BD-Logo.png" alt="Department Logo" />
          </div>
          <h1 className="text-4xl font-bold mb-6">Department of Buddhist Affairs - HRMS</h1>
          <p className="text-lg text-white/90">
            Supporting the guardians of our living Buddhist heritage. Efficiently managing the resources and personnel who preserve the Dhamma.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 relative overflow-hidden">
        {/* Sri Lankan Buddhist Scenery Background */}
        <div className="absolute inset-0 z-0">
          {currentSceneryImage ? (
            <div className="relative w-full h-full">
              <img
                key={currentSceneryImage}
                src={currentSceneryImage}
                alt="Sri Lankan Buddhist Scenery"
                className="w-full h-full object-cover object-center transition-all duration-1000 ease-in-out filter brightness-110 contrast-105"
                style={{ 
                  imageRendering: 'crisp-edges'
                }}
                onError={() =>
                  setCurrentSceneryIndex((p) => ((p + 1) % Math.max(1, loadedSceneryImages.length)))
                }
              />
              {/* Enhanced overlay to ensure form readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/80 to-white/75 backdrop-blur-[2px]"></div>
              
              {/* Image Title Overlay */}
              <div className="absolute top-4 left-4 bg-black/20 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                Sri Lankan Buddhist Heritage
              </div>
              
              {/* Scenery Indicator */}
              {loadedSceneryImages.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-1">
                  {loadedSceneryImages.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        index === currentSceneryIndex 
                          ? 'bg-orange-500 w-6' 
                          : 'bg-white/50 hover:bg-white/80'
                      }`}
                      onClick={() => setCurrentSceneryIndex(index)}
                      title={`View image ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Fallback gradient background */
            <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-orange-50"></div>
          )}
        </div>

        {/* Login Form Container */}
        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/30 ring-1 ring-black/5">
            <h2 className="text-3xl font-bold text-blue-600 mb-2">SIGN IN</h2>
            <p className="text-gray-500 mb-6">Enter your user name and password to login</p>

            {/* Brand-colored inline error */}
            {error && (
              <div className="mb-6" role="alert" aria-live="assertive">
                <div className="flex items-start gap-3 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 text-orange-800">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-semibold">Login failed</p>
                    <p className="text-sm">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    className="ml-2 text-sm underline decoration-dotted hover:opacity-80"
                    aria-label="Dismiss error"
                    title="Dismiss"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">User Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="User name"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <a 
                    href="#" 
                    className="text-sm text-orange-600 hover:text-orange-700 font-medium hover:underline transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Add forgot password functionality
                      router.push("/forgot-password");
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors"
                // NOTE: Do not disable or change text to preserve exact UI.
                onClick={() => void 0}
              >
                SIGN IN
              </button>
            </form>
            <p className="text-center text-sm text-gray-600 mt-6">
              Don&apos;t have an account?{" "}
              <a href="#" className="text-orange-500 hover:text-orange-600 font-semibold">SIGN UP</a>
            </p>
          </div>
          <div className="mt-8 text-center">
            <div className="inline-block bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30 shadow-sm">
              <p className="text-xs font-medium text-gray-700">
                © 2025. Department of Buddhist Affairs - HRMS All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Chatbot - Left Side */}
      <div className="fixed left-6 bottom-6 z-40">
        <div className="relative">
          {/* Chat notification bubble */}
          {!showChatbot && (
            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
              <p className="text-sm font-medium whitespace-nowrap">Do you need help?</p>
              <p className="text-xs opacity-90">To get help click on yes button</p>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-blue-500"></div>
            </div>
          )}
          
          {/* Chatbot GIF Button */}
          <button
            onClick={() => setShowChatbot(!showChatbot)}
            className="group relative bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-orange-200 hover:border-orange-400"
          >
            <img 
              src="/chat-bot/chatbot.gif" 
              alt="Chatbot Assistant" 
              className="w-16 h-16 rounded-full object-cover"
            />
            
            {/* Online status indicator */}
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
          </button>
          
          {/* Yes/Contact Button */}
          {!showChatbot && (
            <button
              onClick={() => setShowChatbot(true)}
              className="mt-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Yes! I need help
            </button>
          )}
          
          {/* Contact Info */}
          {!showChatbot && (
            <div className="mt-2 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 max-w-xs">
              <p className="text-xs font-semibold text-gray-800 mb-1">Contact:</p>
              <p className="text-xs text-blue-600 font-mono">support@dba.gov.lk</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Interface Popup */}
      {showChatbot && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-start p-6">
          <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-md h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300 ml-6 mb-6">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <img 
                    src="/chat-bot/chatbot.gif" 
                    alt="Assistant" 
                    className="w-10 h-10 rounded-full bg-white/20 p-1"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">HRMS Assistant</h3>
                  <p className="text-sm text-blue-100">Online • Ready to help</p>
                </div>
              </div>
              <button
                onClick={() => setShowChatbot(false)}
                className="text-white/80 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 chat-messages-container">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="flex items-start space-x-2 max-w-[80%]">
                    {message.sender === 'bot' && (
                      <img 
                        src="/chat-bot/chatbot.gif" 
                        alt="Bot" 
                        className="w-8 h-8 rounded-full bg-blue-100 p-1 mt-1 flex-shrink-0"
                      />
                    )}
                    <div
                      className={`p-3 rounded-2xl ${
                        message.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-white text-gray-800 rounded-bl-md shadow-sm border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <img 
                      src="/chat-bot/chatbot.gif" 
                      alt="Bot" 
                      className="w-8 h-8 rounded-full bg-blue-100 p-1 mt-1"
                    />
                    <div className="bg-white p-3 rounded-2xl rounded-bl-md shadow-sm border">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-t bg-gray-50">
              <div className="flex flex-wrap gap-2 mb-3">
                <button 
                  onClick={() => {
                    setCurrentMessage("I forgot my password");
                    handleSendMessage();
                  }}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-xs transition-colors"
                >
                  🔑 Forgot Password
                </button>
                <button 
                  onClick={() => {
                    setCurrentMessage("How to create new account?");
                    handleSendMessage();
                  }}
                  className="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-full text-xs transition-colors"
                >
                  👤 New Account
                </button>
                <button 
                  onClick={() => {
                    setCurrentMessage("Contact support team");
                    handleSendMessage();
                  }}
                  className="px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-full text-xs transition-colors"
                >
                  📞 Contact
                </button>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white rounded-b-2xl">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-full transition-colors disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
