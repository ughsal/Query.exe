"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "@/lib/config";

/* ── Types ── */
type SearchResponse = {
  answer: string;
  sources: string[];
  confidence?: "high" | "medium" | "low";
  retrieval_quality?: "authoritative" | "mixed" | "weak";
};
type AppAlert = {
  title: string;
  message: string;
  retryAfter?: string;
};

type AssistantTurn = {
  role: "assistant";
  content: string;
  sources: string[];
  time: number;
  confidence?: "high" | "medium" | "low";
  retrieval_quality?: "authoritative" | "mixed" | "weak";
  error?: string;
};

type UserTurn = { role: "user"; content: string };
type ChatTurn = UserTurn | AssistantTurn;

/* ── Helpers ── */
function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function formatRetry(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) return undefined;

  const h = Math.floor(seconds / 3600);
  const m = Math.ceil((seconds % 3600) / 60);

  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
function accentColor(v?: string) {
  if (v === "high" || v === "authoritative") return "#0B6B2B";
  if (v === "medium" || v === "mixed") return "#8A5A00";
  if (v === "low" || v === "weak") return "#9B0014";
  return "#5A5A6E";
}

const EXAMPLES = [
  { tag: "EDU", text: "Top 10 engineering colleges in India 2025" },
  { tag: "DEV", text: "Explain Docker for beginners" },
  { tag: "NEWS", text: "Latest LangChain release" },
  { tag: "CMP", text: "Compare Ollama and vLLM" },
];

/* ── Styles ── */
const CSS = `

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;min-height:100%;}

body{
  font-family:'IBM Plex Sans',Tahoma,sans-serif;
  font-size:13px;
  color:#1A1A2E;
  background:#C8C6BE;
  overflow-x:hidden;
  overflow-y:auto;
}

:root{
  --face:#D4D0C8;
  --bg:#F0EEE8;
  --inset:#FAFAF8;
  --red:#C8001A;
  --navy:#000080;
  --cobalt:#0047AB;
  --ink:#1A1A2E;
  --muted:#5A5A6E;
  --faint:#9898A8;
  --lt:#ffffff;
  --dk:#808080;
  --sh:#404040;
  --serif:'Playfair Display',Georgia,serif;
  --mono:'IBM Plex Mono','Courier New',monospace;
  --ui:'IBM Plex Sans',Tahoma,sans-serif;
}

/* bevels */
.raised{box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk),inset 2px 2px 0 var(--lt);}
.sunken{box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt),inset 2px 2px 0 var(--dk),inset -2px -2px 0 var(--lt);}
.border-win{border-top:2px solid var(--lt);border-left:2px solid var(--lt);border-right:2px solid var(--sh);border-bottom:2px solid var(--sh);}
.border-win-in{border-top:2px solid var(--sh);border-left:2px solid var(--sh);border-right:2px solid var(--lt);border-bottom:2px solid var(--lt);}

/* shell */
#shell{display:flex;flex-direction:column;height:100dvh;min-height:100dvh;width:100%;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);}

/* ── header ── */
#header{
  flex-shrink:0;
  background:var(--face);
  border-bottom:2px solid var(--sh);
}

#titlebar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  background:linear-gradient(to right,var(--navy) 0%,#1084d0 100%);
  padding:3px 4px 3px 6px;
  user-select:none;
}
#titlebar-left{
  display:flex;align-items:center;gap:6px;
  font-family:var(--ui);font-size:11px;font-weight:600;color:#fff;
}
.title-icon{
  width:14px;height:14px;flex-shrink:0;
}
#titlebar-right{display:flex;gap:2px;}
.wbtn{
  width:18px;height:15px;
  display:flex;align-items:center;justify-content:center;
  font-size:9px;font-weight:bold;line-height:1;
  background:var(--face);color:var(--ink);
  border:none;outline:none;cursor:pointer;
  box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk);
}
.wbtn:active{box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt),inset 2px 2px 0 var(--dk);padding-top:1px;padding-left:1px;}

/* masthead strip */
#masthead{
  display:flex;align-items:center;justify-content:space-between;
  padding:6px 12px 5px;
  border-bottom:1px solid var(--dk);
}
#masthead-left{display:flex;align-items:baseline;gap:10px;}
.mast-name{
  font-family:var(--serif);
  font-size:38px;font-weight:900;font-style:italic;
  color:var(--ink);letter-spacing:-2px;line-height:1;
  text-shadow:2px 2px 0 rgba(0,0,0,0.10);
}
.mast-name em{color:var(--red);font-style:inherit;}
.mast-sub{
  font-family:var(--mono);font-size:9px;font-weight:500;
  color:var(--red);text-transform:uppercase;letter-spacing:2px;
  padding-bottom:2px;
}
#masthead-right{display:flex;align-items:center;gap:5px;}
.chip{
  display:inline-flex;align-items:center;gap:4px;
  padding:2px 7px;
  font-family:var(--mono);font-size:10px;font-weight:500;color:var(--muted);
  background:var(--bg);
  border-top:1px solid var(--lt);border-left:1px solid var(--lt);
  border-right:1px solid var(--dk);border-bottom:1px solid var(--dk);
}
.chip-dot{width:5px;height:5px;border-radius:50%;background:var(--faint);flex-shrink:0;}
.chip-dot.on{background:var(--cobalt);animation:blink 1.2s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}

/* menubar */
#menubar{
  display:flex;gap:0;padding:1px 4px 0;
  border-top:1px solid var(--lt);
}
.mitem{
  padding:2px 8px;font-size:11px;color:var(--ink);cursor:default;
  font-family:var(--ui);
}
.mitem:hover{background:var(--navy);color:#fff;}
.mitem u{text-decoration:underline;}

/* toolbar */
#toolbar{
  display:flex;align-items:center;gap:5px;
  padding:3px 6px;
  border-top:1px solid var(--lt);border-bottom:1px solid var(--dk);
}
.tsep{width:1px;height:18px;background:var(--dk);box-shadow:1px 0 0 var(--lt);margin:0 2px;}
.tlabel{font-size:11px;color:var(--muted);font-family:var(--ui);white-space:nowrap;}

/* footer bar */
#footerbar{
  flex-shrink:0;
  background:var(--face);
  border-top:2px solid var(--sh);
}
#footerbar-form{
  display:flex;align-items:center;gap:6px;
  padding:6px 8px 5px;
  border-bottom:1px solid var(--dk);
}
.qinput-lg{
  flex:1;height:28px;padding:2px 9px;
  font-family:var(--mono);font-size:13px;color:var(--ink);
  background:var(--inset);border:none;outline:none;
  box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt),inset 2px 2px 0 var(--dk),inset -2px -2px 0 var(--lt);
}
.qinput-lg::placeholder{color:var(--faint);}
.qinput-lg:focus{background:#fff;}
.qinput-lg:disabled{color:var(--muted);background:var(--face);}
.btn-search-lg{
  height:28px;padding:0 16px;
  font-family:var(--ui);font-size:12px;font-weight:600;color:#fff;
  background:var(--cobalt);border:none;outline:none;cursor:pointer;white-space:nowrap;
  box-shadow:inset -1px -1px 0 #001f5a,inset 1px 1px 0 #6699dd,inset -2px -2px 0 #0a3080,inset 2px 2px 0 #4477cc;
}
.btn-search-lg:active{box-shadow:inset 1px 1px 0 #001f5a,inset -1px -1px 0 #4477cc,inset 2px 2px 0 #0a3080;padding-top:1px;padding-left:17px;}
.btn-search-lg:disabled{background:var(--face);color:var(--faint);text-shadow:1px 1px 0 var(--lt);box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk);}

.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:3px;
  padding:2px 10px;height:22px;min-width:52px;
  font-family:var(--ui);font-size:11px;font-weight:500;color:var(--ink);
  background:var(--face);border:none;outline:none;cursor:pointer;white-space:nowrap;
  box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk),inset 2px 2px 0 var(--lt);
}
.btn:active{box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt),inset 2px 2px 0 var(--dk);padding-top:3px;padding-left:11px;}
.btn:disabled{color:var(--faint);text-shadow:1px 1px 0 var(--lt);cursor:default;}
.btn:focus-visible{outline:1px dotted var(--ink);outline-offset:-4px;}

.btn-search{
  background:var(--cobalt);color:#fff;font-weight:600;
  box-shadow:inset -1px -1px 0 #001f5a,inset 1px 1px 0 #6699dd,inset -2px -2px 0 #0a3080,inset 2px 2px 0 #4477cc;
}
.btn-search:active{box-shadow:inset 1px 1px 0 #001f5a,inset -1px -1px 0 #4477cc,inset 2px 2px 0 #0a3080;padding-top:3px;padding-left:11px;}
.btn-search:disabled{background:var(--face);color:var(--faint);text-shadow:1px 1px 0 var(--lt);box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk);}



/* ── content ── */
#content{display:flex;flex:1;overflow:hidden;min-height:0;}

/* ── sidebar ── */
#sidebar{
  width:264px;flex-shrink:0;
  display:flex;flex-direction:column;
  background:var(--face);
  border-right:2px solid var(--sh);
  overflow:hidden;
}

.sb-head{
  padding:4px 8px;
  background:var(--navy);
  font-family:var(--mono);font-size:10px;font-weight:500;
  color:#fff;letter-spacing:1px;text-transform:uppercase;
  flex-shrink:0;
}

.sb-section{padding:8px 8px 6px;border-bottom:1px solid var(--dk);}
.sb-label{
  font-family:var(--mono);font-size:9px;font-weight:500;
  color:var(--faint);text-transform:uppercase;letter-spacing:1.5px;
  margin-bottom:5px;
}

.info-row{display:flex;flex-direction:column;gap:2px;margin-bottom:6px;}
.info-row:last-child{margin-bottom:0;}
.info-key{font-family:var(--mono);font-size:9px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;}
.info-val{
  font-family:var(--mono);font-size:11px;
  padding:2px 6px;
  background:var(--bg);
  border-top:1px solid var(--dk);border-left:1px solid var(--dk);
  border-right:1px solid var(--lt);border-bottom:1px solid var(--lt);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
}

/* sources list */
.src-scroll{flex:1;overflow-y:auto;padding:6px 8px;}
.src-scroll::-webkit-scrollbar{width:14px;}
.src-scroll::-webkit-scrollbar-track{background:var(--face);box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt);}
.src-scroll::-webkit-scrollbar-thumb{background:var(--face);box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk);}

.src-item{
  display:flex;align-items:flex-start;gap:5px;
  padding:5px 6px;margin-bottom:4px;
  background:var(--bg);
  border-top:1px solid var(--lt);border-left:1px solid var(--lt);
  border-right:1px solid var(--dk);border-bottom:1px solid var(--dk);
}
.src-num{font-family:var(--mono);font-size:9px;color:var(--red);font-weight:500;flex-shrink:0;padding-top:1px;}
.src-link{font-family:var(--mono);font-size:10px;color:var(--cobalt);text-decoration:none;word-break:break-all;line-height:1.4;}
.src-link:hover{color:var(--red);text-decoration:underline;}

.sb-empty{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:6px;padding:16px;text-align:center;
}
.sb-empty-txt{font-family:var(--mono);font-size:9px;color:var(--faint);text-transform:uppercase;letter-spacing:1px;line-height:1.7;}

/* ── chat column ── */
#chat-col{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--face);}

#chat-inner{
  background:var(--inset);
  border-top:2px solid var(--sh);border-left:2px solid var(--sh);
  border-right:2px solid var(--lt);border-bottom:2px solid var(--lt);
  flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden;
  margin:4px;
}

#chat-scroll{
  flex:1;overflow-y:auto;
  padding:24px 28px;
  background:#fff;
}
#chat-scroll::-webkit-scrollbar{width:16px;}
#chat-scroll::-webkit-scrollbar-track{background:var(--face);box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt);}
#chat-scroll::-webkit-scrollbar-thumb{background:var(--face);box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk);}

/* welcome */
.welcome{margin:auto;max-width:520px;padding:32px 0;text-align:center;}
.welcome-hero{
  font-family:var(--serif);font-size:80px;font-weight:900;font-style:italic;
  color:var(--ink);letter-spacing:-4px;line-height:0.88;
  text-shadow:3px 3px 0 rgba(0,0,0,0.07);
}
.welcome-hero em{color:var(--red);font-style:inherit;}
.welcome-rule{width:40px;height:3px;background:var(--red);margin:16px auto;}
.welcome-mono{font-family:var(--mono);font-size:9px;color:var(--faint);text-transform:uppercase;letter-spacing:3px;margin-bottom:4px;}
.welcome-desc{font-size:13px;color:var(--muted);line-height:1.7;max-width:380px;margin:0 auto;}
.examples{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:20px;}
.ex-btn{
  text-align:left;padding:8px 10px;
  font-family:var(--ui);font-size:11px;color:var(--ink);
  background:var(--face);border:none;cursor:pointer;line-height:1.45;
  box-shadow:inset -1px -1px 0 var(--sh),inset 1px 1px 0 var(--lt),inset -2px -2px 0 var(--dk),inset 2px 2px 0 var(--lt);
}
.ex-btn:hover{background:#E2DED8;}
.ex-btn:active{box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt),inset 2px 2px 0 var(--dk);padding:9px 9px 7px 11px;}
.ex-tag{display:block;font-family:var(--mono);font-size:9px;font-weight:500;color:var(--red);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;}

/* messages */
.msgs{max-width:680px;}
.msg{padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.06);}
.msg:last-child{border-bottom:none;}

.msg-label{
  font-family:var(--mono);font-size:9px;font-weight:500;
  text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;
}
.lbl-user{color:var(--red);}
.lbl-ai{color:var(--cobalt);}

.msg-user-box{
  padding:8px 12px;
  font-family:var(--mono);font-size:12px;color:var(--ink);line-height:1.55;
  background:var(--bg);
  border-top:1px solid var(--dk);border-left:1px solid var(--dk);
  border-right:1px solid var(--lt);border-bottom:1px solid var(--lt);
}

.msg-ai-box{
  padding:14px 16px;
  font-family:var(--ui);font-size:14px;color:var(--ink);
  line-height:1.8;white-space:pre-wrap;word-break:break-word;
  background:#fff;
  border-top:1px solid var(--dk);border-left:1px solid var(--dk);
  border-right:1px solid var(--lt);border-bottom:1px solid var(--lt);
}
.msg-ai-box.err{color:var(--red);}

.meta{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:7px;}
.meta-time{font-family:var(--mono);font-size:10px;color:var(--faint);}
.seg{
  display:inline-flex;align-items:center;
  padding:1px 6px;
  font-family:var(--mono);font-size:9px;font-weight:500;
  background:var(--bg);
  border-top:1px solid var(--lt);border-left:1px solid var(--lt);
  border-right:1px solid var(--dk);border-bottom:1px solid var(--dk);
}

/* thinking */
.thinking{display:flex;gap:4px;align-items:center;padding:6px 0;}
.tdot{width:5px;height:5px;border-radius:50%;background:var(--cobalt);animation:tdots 1.2s ease-in-out infinite;}
.tdot:nth-child(2){animation-delay:.2s;}
.tdot:nth-child(3){animation-delay:.4s;}
@keyframes tdots{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}

/* ── statusbar ── */
#statusbar{
  display:flex;align-items:stretch;flex-shrink:0;
  background:var(--face);border-top:2px solid var(--sh);
}
.sp{
  display:flex;align-items:center;padding:2px 8px;
  font-family:var(--mono);font-size:10px;color:var(--muted);
  box-shadow:inset 1px 1px 0 var(--sh),inset -1px -1px 0 var(--lt);
}
.sp+.sp{border-left:1px solid var(--dk);}
.sp.main{flex:1;}
.sp.working{color:var(--cobalt);}


/* ── responsive controls ── */
.mobile-sidebar-btn{display:none;}
.sidebar-scrim{display:none;}

/* Tablet: keep dashboard structure, but stack metadata below chat */
@media (max-width:1024px){
  #content{flex-direction:column;}
  #chat-col{order:1;min-height:0;}
  #sidebar{
    order:2;width:100%;max-height:220px;
    border-right:none;border-top:2px solid var(--lt);border-bottom:2px solid var(--sh);
  }
  .src-scroll{max-height:118px;}
  #chat-scroll{padding:18px 20px;}
  .msg-ai-box{font-size:13px;line-height:1.65;padding:12px 14px;}
  .welcome-hero{font-size:60px;}
  .welcome{padding:24px 0;}
  #masthead-right{gap:3px;}
  .chip{font-size:9px;padding:2px 5px;}
}

/* Mobile: sources become a bottom sheet, chat keeps full width */
@media (max-width:640px){
  body{overflow-y:auto;}
  #shell{height:100dvh;min-height:100dvh;}
  #titlebar-left{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;}
  #titlebar-right{flex-shrink:0;}

  #masthead{padding:5px 8px;align-items:flex-start;}
  #masthead-left{flex-direction:column;align-items:flex-start;gap:2px;min-width:0;}
  .mast-name{font-size:30px;letter-spacing:-1px;line-height:.95;}
  .mast-sub{font-size:8px;letter-spacing:1.1px;max-width:250px;line-height:1.3;padding-bottom:0;}
  #masthead-right{display:none;}

  #menubar{overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch;}
  .mitem{padding:3px 7px;}
  #toolbar{gap:4px;overflow-x:auto;-webkit-overflow-scrolling:touch;}
  .mobile-sidebar-btn{display:inline-flex;}
  #toolbar .tlabel{display:none;}
  #toolbar .tsep{display:none;}
  .btn{height:26px;min-width:64px;}

  #content{position:relative;flex:1;min-height:0;overflow:hidden;}
  #chat-col{order:1;min-height:0;}
  #sidebar{
    position:fixed;
    left:max(8px,env(safe-area-inset-left));
    right:max(8px,env(safe-area-inset-right));
    bottom:calc(86px + env(safe-area-inset-bottom));
    z-index:60;width:auto;max-height:56dvh;order:initial;
    transform:translateY(120%);transition:transform 160ms ease;
    border:2px solid var(--sh);box-shadow:4px 4px 0 rgba(0,0,0,.35);
  }
  #sidebar.sidebar-open{transform:translateY(0);}
  .sidebar-scrim{
    display:block;position:fixed;inset:0;z-index:55;border:0;background:rgba(0,0,0,.18);
    opacity:0;pointer-events:none;transition:opacity 160ms ease;
  }
  .sidebar-scrim.sidebar-open{opacity:1;pointer-events:auto;}
  .src-scroll{max-height:30dvh;}

  #chat-inner{margin:2px;}
  #chat-scroll{padding:14px 12px;}
  .msgs{max-width:none;}
  .msg{padding:12px 0;}
  .msg-ai-box{padding:11px 12px;font-size:12px;line-height:1.6;}
  .msg-user-box{font-size:11px;line-height:1.5;}
  .msg-label{font-size:8px;letter-spacing:1.5px;}

  .welcome{padding:18px 0;max-width:100%;}
  .welcome-hero{font-size:42px;letter-spacing:-2px;}
  .welcome-rule{margin:12px auto;}
  .welcome-desc{font-size:12px;line-height:1.6;padding:0 6px;}
  .welcome-mono{font-size:8px;letter-spacing:2px;}
  .examples{grid-template-columns:1fr;gap:7px;margin-top:16px;}
  .ex-btn{min-height:44px;padding:9px 10px;}

  #footerbar-form{padding:8px;gap:6px;}
  #footerbar-form .tlabel{display:none;}
  .qinput-lg{height:44px;font-size:12px;min-width:0;}
  .btn-search-lg{height:44px;min-width:78px;padding:0 12px;font-size:11px;}
  .btn-search-lg:active{padding-left:13px;}
  #statusbar{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  .sp{white-space:nowrap;min-height:22px;}
  .sp:nth-child(2){display:none;}
}
.alert-wrap{
  position:fixed;
  inset:0;
  z-index:100;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(0,0,0,.22);
  padding:16px;
}

.alert-box{
  width:min(420px, calc(100vw - 32px));
  max-height:calc(100dvh - 32px);
  overflow:hidden;
  background:var(--face);
  color:#111;
  box-shadow:
    4px 4px 0 rgba(0,0,0,.35),
    inset -1px -1px 0 var(--sh),
    inset 1px 1px 0 var(--lt),
    inset -2px -2px 0 var(--dk),
    inset 2px 2px 0 var(--lt);
}

.alert-title{
  background:linear-gradient(to right,var(--navy),#1084d0);
  color:#fff;
  font-family:var(--ui);
  font-size:11px;
  font-weight:700;
  padding:4px 7px;
}

.alert-body{
  display:grid;
  grid-template-columns:34px 1fr;
  gap:12px;
  padding:18px 16px 12px;
  color:#111;
  font-family:var(--ui);
  font-size:13px;
  line-height:1.55;
  max-height:60dvh;
  overflow-y:auto;
}

.alert-body > div{
  min-width:0;
}

.alert-body p{
  color:#111;
  overflow-wrap:anywhere;
  word-break:normal;
}

.alert-icon{
  width:34px;
  height:34px;
  display:flex;
  align-items:center;
  justify-content:center;
  background:#d63a3a;
  color:#fff;
  font-family:var(--mono);
  font-size:22px;
  font-weight:700;
}

.alert-heading{
  color:#000;
  font-weight:700;
  font-size:14px;
  margin-bottom:6px;
}

.alert-muted{
  margin-top:10px;
  color:#333;
  font-family:var(--mono);
  font-size:11px;
  line-height:1.45;
  overflow-wrap:anywhere;
}

.alert-actions{
  display:flex;
  justify-content:center;
  padding:8px 12px 14px;
}

/* Mobile alert */
@media (max-width:480px){
  .alert-wrap{
    align-items:flex-start;
    padding:72px 10px 10px;
  }

  .alert-box{
    width:100%;
    max-width:none;
    min-width:0;
    max-height:calc(100dvh - 96px);
  }

  .alert-body{
    display:block;
    padding:14px;
    font-size:12px;
    line-height:1.5;
    max-height:calc(100dvh - 190px);
  }

  .alert-icon{
    width:26px;
    height:26px;
    float:left;
    margin:2px 10px 4px 0;
    font-size:16px;
  }

  .alert-heading{
    font-size:13px;
    margin-bottom:6px;
  }

  .alert-actions{
    padding:8px 10px 12px;
  }

  .alert-actions .btn{
    min-width:88px;
    height:30px;
  }
}

/* Very small phones */
@media (max-width:390px){
  .mast-name{font-size:26px;}
  .mast-sub{max-width:210px;}
  .mitem{padding:3px 6px;}
  #chat-scroll{padding:10px;}
  .btn-search-lg{min-width:68px;font-size:10px;}
  .qinput-lg{font-size:11px;}
  .welcome-hero{font-size:36px;}
}

@media (max-height: 560px) and (max-width: 900px) {
  #masthead {
    display: none;
  }

  #menubar {
    display: none;
  }

  #chat-scroll {
    padding: 8px;
  }

  #sidebar {
    max-height: 70dvh;
  }
}

@media (max-width:480px){

  .alert-wrap{
    align-items:flex-start;
    justify-content:center;

    padding:12px;
  }

  .alert-box{
    width:calc(100vw - 8px);
    max-width:calc(100vw - 8px);
    min-width:0;

    max-height:calc(100dvh - 24px);
  }

  .alert-title{
    padding:6px 8px;
    font-size:12px;
  }

  .alert-body{
    display:block;

    padding:16px;

    font-size:13px;
    line-height:1.6;

    max-height:calc(100dvh - 150px);

    overflow-y:auto;
  }

  .alert-icon{
    float:left;
    margin:0 12px 8px 0;

    width:30px;
    height:30px;

    font-size:18px;
  }

  .alert-heading{
    font-size:14px;
  }

  .alert-actions{
    padding:10px;
  }

  .alert-actions .btn{
    width:100%;
    min-height:36px;
  }
}

`;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [turns, setTurns] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appAlert, setAppAlert] = useState<AppAlert | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lastAI = useMemo(
    () =>
      [...chat].reverse().find(t => t.role === "assistant") as
        | AssistantTurn
        | undefined,
    [chat],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat, loading]);

  async function runSearch(prompt: string) {
    setLoading(true);
    setSidebarOpen(false);
    setTurns(n => n + 1);
    setChat(old => [...old, { role: "user", content: prompt }]);
    const t0 = performance.now();
    try {
      const res = await fetch(`${API_URL}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: prompt }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : null;
      const ms = Math.round(performance.now() - t0);
      if (!res.ok) {
        const msg = json?.error ?? `HTTP ${res.status}`;

        if (res.status === 429) {
          setAppAlert({
            title: "Search Limit Reached",
            message: msg,
            retryAfter: formatRetry(json?.retry_after_seconds),
          });

          return;
        }

        if (res.status === 400) {
          setAppAlert({
            title: "Invalid Query",
            message: msg,
          });

          return;
        }

        if (res.status >= 500) {
          setAppAlert({
            title: "Server Error",
            message:
              "The server encountered an unexpected error. Please try again shortly.",
          });

          return;
        }

        setAppAlert({
          title: "Request Failed",
          message: msg,
        });
      } else {
        const d = json as SearchResponse;

        setChat(old => [
          ...old,
          {
            role: "assistant",
            content: d.answer,
            sources: d.sources ?? [],
            confidence: d.confidence,
            retrieval_quality: d.retrieval_quality,
            time: ms,
          },
        ]);
      }
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Unable to connect to the server.";

      setAppAlert({
        title: "Connection Error",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div id="shell">
        {/* ── Header ── */}
        <div id="header">
          {/* Title bar */}
          <div id="titlebar">
            <div id="titlebar-left">
              <svg
                className="title-icon"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="1"
                  y="1"
                  width="12"
                  height="9"
                  fill="#000080"
                  stroke="#fff"
                  strokeWidth="0.75"
                />
                <rect x="2" y="2" width="10" height="7" fill="#1084d0" />
                <rect x="4" y="10" width="6" height="1" fill="#c0c0c0" />
                <rect x="2" y="11" width="10" height="1" fill="#c0c0c0" />
              </svg>
              QUERY.EXE — Web Intelligence Terminal
              {appAlert && (
                <div className="alert-wrap" role="dialog" aria-modal="true">
                  <div className="alert-box">
                    <div className="alert-title">QUERY.EXE</div>

                    <div className="alert-body">
                      <div className="alert-icon">!</div>

                      <div>
                        <div className="alert-heading">{appAlert.title}</div>
                        <p>{appAlert.message}</p>

                        {appAlert.retryAfter && (
                          <p className="alert-muted">
                            Try again in approximately {appAlert.retryAfter}.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="alert-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => setAppAlert(null)}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div id="titlebar-right">
              <button type="button" className="wbtn" title="Minimize">
                _
              </button>
              <button type="button" className="wbtn" title="Maximize">
                □
              </button>
              <button type="button" className="wbtn" title="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Masthead */}
          <div id="masthead">
            <div id="masthead-left">
              <span className="mast-name">
                QUERY<em>.</em>EXE
              </span>
              <span className="mast-sub">Editorial Search Workstation</span>
            </div>
            <div id="masthead-right">
              <div className="chip">
                <span className={`chip-dot${loading ? " on" : ""}`} />
                {loading ? "WORKING" : "READY"}
              </div>
              <div className="chip">Tavily</div>
              <div className="chip">LCEL</div>
              <div className="chip">
                {turns} {turns === 1 ? "QUERY" : "QUERIES"}
              </div>
            </div>
          </div>

          {/* Menu bar */}
          <nav id="menubar" role="menubar">
            {[
              ["F", "ile"],
              ["S", "earch"],
              ["H", "istory"],
              ["M", "odels"],
              ["T", "ools"],
              ["H", "elp"],
            ].map(([u, rest]) => (
              <span key={u + rest} className="mitem" role="menuitem">
                <u>{u}</u>
                {rest}
              </span>
            ))}
          </nav>

          {/* Toolbar */}
          <div id="toolbar">
            <button
              className="btn mobile-sidebar-btn"
              onClick={() => setSidebarOpen(v => !v)}
              type="button"
              aria-expanded={sidebarOpen}
              aria-controls="sidebar"
            >
              ▣ Sources
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setChat([]);
                setTurns(0);
              }}
            >
              ⊞ New
            </button>
            <div className="tsep" />
            <span className="tlabel">
              Use the search bar below to enter a query
            </span>
          </div>
        </div>

        {/* ── Content ── */}
        <div id="content">
          {/* ── Sidebar (left) ── */}
          <div id="sidebar" className={sidebarOpen ? "sidebar-open" : ""}>
            <div className="sb-head">System</div>
            <div className="sb-section">
              <div className="sb-label">Session</div>
              <div className="info-row">
                <span className="info-key">Status</span>
                <span
                  className="info-val"
                  style={{ color: loading ? "#0047AB" : "#0B6B2B" }}
                >
                  {loading ? "Searching…" : "Ready"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-key">Confidence</span>
                <span
                  className="info-val"
                  style={{ color: accentColor(lastAI?.confidence) }}
                >
                  {lastAI?.confidence?.toUpperCase() ?? "N/A"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-key">Retrieval</span>
                <span
                  className="info-val"
                  style={{ color: accentColor(lastAI?.retrieval_quality) }}
                >
                  {lastAI?.retrieval_quality?.toUpperCase() ?? "N/A"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-key">Latency</span>
                <span className="info-val">
                  {lastAI ? `${(lastAI.time / 1000).toFixed(2)}s` : "N/A"}
                </span>
              </div>
              <div className="info-row">
                <span className="info-key">Sources</span>
                <span className="info-val">{lastAI?.sources?.length ?? 0}</span>
              </div>
            </div>

            <div className="sb-head" style={{ marginTop: 0 }}>
              Sources
            </div>

            {lastAI?.sources?.length ? (
              <div className="src-scroll">
                {lastAI.sources.map((src, i) => (
                  <div key={i} className="src-item">
                    <span className="src-num">{i + 1}.</span>
                    <Link
                      href={src}
                      target="_blank"
                      rel="noreferrer"
                      className="src-link"
                      title={src}
                    >
                      {hostname(src)}
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="sb-empty">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 28 28"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="2"
                    y="4"
                    width="24"
                    height="20"
                    rx="0"
                    fill="#D4D0C8"
                    stroke="#808080"
                    strokeWidth="1"
                  />
                  <rect
                    x="4"
                    y="6"
                    width="20"
                    height="2"
                    fill="#808080"
                    opacity=".4"
                  />
                  <rect
                    x="4"
                    y="10"
                    width="14"
                    height="1.5"
                    fill="#808080"
                    opacity=".3"
                  />
                  <rect
                    x="4"
                    y="13"
                    width="18"
                    height="1.5"
                    fill="#808080"
                    opacity=".3"
                  />
                  <rect
                    x="4"
                    y="16"
                    width="10"
                    height="1.5"
                    fill="#808080"
                    opacity=".3"
                  />
                </svg>
                <div className="sb-empty-txt">
                  Sources appear
                  <br />
                  after each search
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`sidebar-scrim${sidebarOpen ? " sidebar-open" : ""}`}
            aria-label="Close sources panel"
            onClick={() => setSidebarOpen(false)}
          />

          {/* ── Chat column ── */}
          <div id="chat-col">
            <div id="chat-inner">
              <div id="chat-scroll" ref={scrollRef}>
                {/* Welcome hero */}
                {chat.length === 0 && !loading && (
                  <div className="welcome">
                    <div className="welcome-hero">
                      QUERY<em>.</em>
                      <br />
                      EXE
                    </div>
                    <div className="welcome-rule" />
                    <div className="welcome-mono">
                      Web Intelligence Terminal
                    </div>
                    <p className="welcome-desc">
                      Ask anything. Retrieve sources, summarize evidence, and
                      get grounded answers with confidence ratings.
                    </p>
                    <div className="examples">
                      {EXAMPLES.map(ex => (
                        <button
                          key={ex.text}
                          className="ex-btn"
                          onClick={() => {
                            if (!loading) void runSearch(ex.text);
                          }}
                        >
                          <span className="ex-tag">{ex.tag}</span>
                          {ex.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages */}
                <div className="msgs">
                  {chat.map((turn, i) => {
                    if (turn.role === "user")
                      return (
                        <div key={i} className="msg">
                          <div className="msg-label lbl-user">Query</div>
                          <div className="msg-user-box">{turn.content}</div>
                        </div>
                      );
                    return (
                      <div key={i} className="msg">
                        <div className="msg-label lbl-ai">Answer</div>
                        <div
                          className={`msg-ai-box${turn.error ? " err" : ""}`}
                        >
                          {turn.content}
                        </div>
                        <div className="meta">
                          <span className="meta-time">
                            {(turn.time / 1000).toFixed(1)}s
                          </span>
                          {turn.confidence && (
                            <span
                              className="seg"
                              style={{ color: accentColor(turn.confidence) }}
                            >
                              CONF: {turn.confidence.toUpperCase()}
                            </span>
                          )}
                          {turn.retrieval_quality && (
                            <span
                              className="seg"
                              style={{
                                color: accentColor(turn.retrieval_quality),
                              }}
                            >
                              RET: {turn.retrieval_quality.toUpperCase()}
                            </span>
                          )}
                          {turn.error && (
                            <span className="seg" style={{ color: "#9B0014" }}>
                              ERR
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {loading && (
                    <div className="msg">
                      <div className="msg-label lbl-ai">Status</div>
                      <div className="thinking">
                        <div className="tdot" />
                        <div className="tdot" />
                        <div className="tdot" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer bar (search + status) ── */}
        <div id="footerbar">
          <SearchForm loading={loading} onSearch={runSearch} />
          <div id="statusbar">
            <div className={`sp main${loading ? " working" : ""}`}>
              {loading
                ? "● Searching the web…"
                : chat.length === 0
                  ? "Ready — enter a query below"
                  : "● Done"}
            </div>
            <div className="sp">LCEL + Tavily + Ollama</div>
            <div className="sp">QUERY.EXE v1.0</div>
          </div>
        </div>
      </div>
    </>
  );
}

function SearchForm({
  loading,
  onSearch,
}: {
  loading: boolean;
  onSearch: (prompt: string) => Promise<void>;
}) {
  const [query, setQuery] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const prompt = query.trim();
    if (!prompt || loading) return;

    setQuery("");
    await onSearch(prompt);
  }

  return (
    <form id="footerbar-form" onSubmit={handleSubmit}>
      <span className="tlabel" style={{ flexShrink: 0 }}>
        Query:
      </span>

      <input
        className="qinput-lg"
        placeholder="Enter your search query and press Enter or click Search…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        disabled={loading}
        autoComplete="off"
        spellCheck={false}
        aria-label="Search query"
      />

      <button
        type="submit"
        className="btn-search-lg"
        disabled={loading || query.trim().length < 3}
      >
        {loading ? "Searching…" : "Search ↵"}
      </button>
    </form>
  );
}
