"use client";

import React from "react";

const PerfumeLogo: React.FC = () => {
    return (
        <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
            <style>{`
                @keyframes logo-entrance {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                @keyframes logo-circle-entrance {
                    0% { opacity: 0; transform: scale(0); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes logo-breathe {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(4px); }
                }
                @keyframes logo-bar-entrance {
                    0% { opacity: 0; transform: scaleX(0); }
                    100% { opacity: 1; transform: scaleX(1); }
                }
                .logo-text {
                    animation: logo-entrance 1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    opacity: 0;
                }
                .logo-bar {
                    transform-origin: left;
                    animation: logo-bar-entrance 0.6s ease-out 0.6s both;
                }
                .logo-circle {
                    animation: 
                        logo-circle-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both,
                        logo-breathe 4s ease-in-out infinite alternate;
                }
                .logo-c1 { animation-delay: 0.5s, 0s; }
                .logo-c2 { animation-delay: 0.65s, 0.2s; }
                .logo-c3 { animation-delay: 0.8s, 0.4s; }
            `}</style>
            
            <div className="relative w-full max-w-[200px] flex items-center justify-center">
                <svg
                    viewBox="0 0 500 120"
                    className="w-full h-auto z-20"
                    preserveAspectRatio="xMidYMid meet"
                >
                        <g className="logo-main-content">
                            {/* p */}
                            <g>
                                <circle cx="30" cy="66" r="11" fill="currentColor" />
                                <text x="14" y="80" className="logo-text font-bold text-[55px] select-none" fill="currentColor" style={{ animationDelay: '0s' }}>p</text>
                            </g>
                            
                            {/* e1 */}
                            <g>
                                <circle cx="62" cy="60" r="8" fill="currentColor" />
                                <text x="47" y="80" className="logo-text font-bold text-[55px] select-none" fill="currentColor" style={{ animationDelay: '0.05s' }}>e</text>
                            </g>

                            {/* rfum */}
                            <text x="80" y="80" className="logo-text font-bold text-[55px] select-none" fill="currentColor" letterSpacing="1" style={{ animationDelay: '0.1s' }}>rfum</text>

                            {/* e2 */}
                            <g>
                                <circle cx="225" cy="60" r="8" fill="currentColor" />
                                <text x="210" y="80" className="logo-text font-bold text-[55px] select-none" fill="currentColor" style={{ animationDelay: '0.15s' }}>e</text>
                                <line className="logo-bar" x1="213" y1="45" x2="238" y2="45" stroke="currentColor" strokeWidth="4" />
                            </g>

                            {/* b */}
                            <g>
                                <circle cx="260" cy="65" r="11" fill="currentColor" />
                                <text x="243" y="80" className="logo-text font-bold text-[55px] select-none" fill="currentColor" style={{ animationDelay: '0.2s' }}>b</text>
                            </g>

                            {/* circles o */}
                            <g style={{ isolation: "isolate" }}>
                                <circle className="logo-circle logo-c1" cx="300" cy="65" r="18" fill="rgba(240, 160, 210, 0.7)" style={{ mixBlendMode: "multiply", transformOrigin: "300px 65px" }} />
                                <circle className="logo-circle logo-c2" cx="330" cy="65" r="18" fill="rgba(110, 200, 240, 0.7)" style={{ mixBlendMode: "multiply", transformOrigin: "330px 65px" }} />
                                <circle className="logo-circle logo-c3" cx="315" cy="82" r="18" fill="rgba(250, 220, 90, 0.8)" style={{ mixBlendMode: "multiply", transformOrigin: "315px 82px" }} />
                            </g>

                            {/* th */}
                            <text x="360" y="80" className="logo-text font-bold text-[55px] select-none" fill="currentColor" style={{ animationDelay: '0.25s' }}>th</text>
                        </g>
                 </svg>
            </div>
        </div>
    );
};

export default PerfumeLogo;
