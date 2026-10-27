"use client";

import { useState, useEffect } from "react";


// Helper to compute MD5 hash of email for Gravatar
function md5(string: string): string { 
  function md5_Cycle(x: number[], k: number[]) {
    var a = x[0], b = x[1], c = x[2], d = x[3];

    a = ff(a, b, c, d, k[0], 7, -680876936);
    d = ff(d, a, b, c, k[1], 12, -389564586);
    c = ff(c, d, a, b, k[2], 17,  606105819);
    b = ff(b, c, d, a, k[3], 22, -1044525330);
    a = ff(a, b, c, d, k[4], 7, -176418897);
    d = ff(d, a, b, c, k[5], 12,  1200080426);
    c = ff(c, d, a, b, k[6], 17, -1473231341);
    b = ff(b, c, d, a, k[7], 22, -45705983);
    a = ff(a, b, c, d, k[8], 7,  1770035416);
    d = ff(d, a, b, c, k[9], 12, -1958414417);
    c = ff(c, d, a, b, k[10], 17, -42063);
    b = ff(b, c, d, a, k[11], 22, -1990404162);
    a = ff(a, b, c, d, k[12], 7,  1804603682);
    d = ff(d, a, b, c, k[13], 12, -40341101);
    c = ff(c, d, a, b, k[14], 17, -1502002290);
    b = ff(b, c, d, a, k[15], 22,  1236535329);

    a = gg(a, b, c, d, k[1], 5, -165796510);
    d = gg(d, a, b, c, k[6], 9, -1069501632);
    c = gg(c, d, a, b, k[11], 14,  643717713);
    b = gg(b, c, d, a, k[0], 20, -373897302);
    a = gg(a, b, c, d, k[5], 5, -701558691);
    d = gg(d, a, b, c, k[10], 9,  38016083);
    c = gg(c, d, a, b, k[15], 14, -660478335);
    b = gg(b, c, d, a, k[4], 20, -405537848);
    a = gg(a, b, c, d, k[9], 5,  568446438);
    d = gg(d, a, b, c, k[14], 9, -1019803690);
    c = gg(c, d, a, b, k[3], 14, -187363961);
    b = gg(b, c, d, a, k[8], 20,  1163531501);
    a = gg(a, b, c, d, k[13], 5, -1444681467);
    d = gg(d, a, b, c, k[2], 9, -51403784);
    c = gg(c, d, a, b, k[7], 14,  1735328473);
    b = gg(b, c, d, a, k[12], 20, -1926607734);

    a = hh(a, b, c, d, k[5], 4, -378558);
    d = hh(d, a, b, c, k[8], 11, -2022574463);
    c = hh(c, d, a, b, k[11], 16,  1839030562);
    b = hh(b, c, d, a, k[14], 23, -35309556);
    a = hh(a, b, c, d, k[1], 4, -1530992060);
    d = hh(d, a, b, c, k[4], 11,  1272893353);
    c = hh(c, d, a, b, k[7], 16, -155497632);
    b = hh(b, c, d, a, k[10], 23, -1094730640);
    a = hh(a, b, c, d, k[13], 4,  681279174);
    d = hh(d, a, b, c, k[0], 11, -358537222);
    c = hh(c, d, a, b, k[3], 16, -722521979);
    b = hh(b, c, d, a, k[6], 23,  76029189);
    a = hh(a, b, c, d, k[9], 4, -640364487);
    d = hh(d, a, b, c, k[12], 11, -421815835);
    c = hh(c, d, a, b, k[15], 16,  530742520);
    b = hh(b, c, d, a, k[2], 23, -995338651);

    a = ii(a, b, c, d, k[0], 6, -198630844);
    d = ii(d, a, b, c, k[7], 10,  1126891415);
    c = ii(c, d, a, b, k[14], 15, -1416354905);
    b = ii(b, c, d, a, k[5], 21, -57434055);
    a = ii(a, b, c, d, k[12], 6,  1700485571);
    d = ii(d, a, b, c, k[3], 10, -1894986606);
    c = ii(c, d, a, b, k[10], 15, -1051523);
    b = ii(b, c, d, a, k[1], 21, -2054922799);
    a = ii(a, b, c, d, k[8], 6,  1873313359);
    d = ii(d, a, b, c, k[15], 10, -30611744);
    c = ii(c, d, a, b, k[6], 15, -1560198380);
    b = ii(b, c, d, a, k[13], 21,  1309151649);
    a = ii(a, b, c, d, k[4], 6, -145523070);
    d = ii(d, a, b, c, k[11], 10, -1120210379);
    c = ii(c, d, a, b, k[2], 15,  718787259);
    b = ii(b, c, d, a, k[9], 21, -343485551);

    x[0] = add32(a, x[0]);
    x[1] = add32(b, x[1]);
    x[2] = add32(c, x[2]);
    x[3] = add32(d, x[3]);
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return add32(leftRotate(add32(add32(a, q), add32(x, t)), s), b);
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | (~d)), a, b, x, s, t);
  }

  function leftRotate(x: number, c: number) {
    return (x << c) | (x >>> (32 - c));
  }

  function add32(x: number, y: number) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  var r: number[] = [];
  var s = unescape(encodeURIComponent(string.trim().toLowerCase()));
  for (var i = 0; i < s.length; i++) {
    r[i >> 2] |= s.charCodeAt(i) << ((i % 4) * 8);
  }
  r[s.length >> 2] |= 0x80 << ((s.length % 4) * 8);
  var len = r.length;
  while ((len % 16) !== 14) {
    r[len++] = 0;
  }
  r[len++] = s.length * 8;
  r[len++] = 0;

  var h = [1732584193, -271733879, -1732584194, 271733878];
  for (var j = 0; j < r.length; j += 16) {
    md5_Cycle(h, r.slice(j, j + 16));
  }

  return h.map(function(v) {
    var hex = "";
    for (var i = 0; i < 4; i++) {
      hex += ((v >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
    }
    return hex;
  }).join("");
}

interface AccountHeroProps {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    ordersCount: number;
    addressesCount?: number;
    gender?: string;
  };
}

interface UserProfileAvatarProps {
  email: string;
  gender?: string;
  size?: number;
  firstName?: string;
  lastName?: string;
}

export function InitialsAvatar({
  firstName = "",
  lastName = "",
  gender,
  size = 56,
}: {
  firstName?: string;
  lastName?: string;
  gender?: string;
  size?: number;
}) {
  const f = firstName ? firstName.trim().charAt(0).toUpperCase() : "";
  const l = lastName ? lastName.trim().charAt(0).toUpperCase() : "";
  const initials = `${f}${l}` || "PB";

  // Gradient selection
  let backgroundGradient = "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"; // navy for men
  if (gender === "women") {
    backgroundGradient = "linear-gradient(135deg, #581c36 0%, #2a0b18 100%)"; // plum/burgundy for women
  } else if (gender !== "men") {
    backgroundGradient = "linear-gradient(135deg, #27272a 0%, #09090b 100%)"; // charcoal for unspecified
  }

  const fontSize = size ? Math.max(12, Math.floor(size * 0.35)) : 20;

  return (
    <div
      className="w-full h-full rounded-full flex items-center justify-center select-none"
      style={{
        background: backgroundGradient,
        border: "2px solid #ebc073",
        boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
      }}
    >
      <span
        className="font-bold text-center animate-fade-in"
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: `${fontSize}px`,
          letterSpacing: "0.05em",
          color: "#ebc073",
          textShadow: "0 2px 4px rgba(0,0,0,0.4)"
        }}
      >
        {initials}
      </span>
    </div>
  );
}

export function UserProfileAvatar({
  email,
  gender,
  size = 56,
  firstName = "",
  lastName = "",
}: UserProfileAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (email) {
      const emailHash = md5(email);
      setAvatarUrl(`https://www.gravatar.com/avatar/${emailHash}?d=404`);
      setHasError(false);
    }
  }, [email]);

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt="Profile Avatar"
        className="w-full h-full object-cover rounded-full animate-fade-in"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <InitialsAvatar
      firstName={firstName}
      lastName={lastName}
      gender={gender}
      size={size}
    />
  );
}

export default function AccountHero({ customer }: AccountHeroProps) {
  return (
    <div
      className="w-full relative overflow-hidden"
      style={{
        borderBottom: "1px solid rgba(184,146,74,0.15)",
      }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/account-hero-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 lg:px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-5"
     >
       

        {/* ── Left: Avatar + Info ── */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative flex-shrink-0 animate-fade-in">
            <div
              className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shadow-lg select-none"
              style={{
                border: "2px solid rgba(235,192,115,0.4)",
                boxShadow: "0 0 0 4px rgba(184,146,74,0.1), 0 4px 20px rgba(184,146,74,0.25)",
              }}
            >
              <UserProfileAvatar
                email={customer.email}
                gender={customer.gender}
                size={56}
                firstName={customer.firstName}
                lastName={customer.lastName}
              />
            </div>
            {/* Online dot */}
            <span
              className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full"
              style={{
                background: "#22c55e",
                border: "2px solid rgba(14,17,23,0.8)",
              }}
            />
          </div>

          {/* User Info */}
          <div className="min-w-0">
            <p
              className="text-[10px] uppercase tracking-[0.18em] font-bold mb-0.5"
              style={{ color: "rgba(235,192,115,0.65)" }}
            >
              Hello,
            </p>
            <h1
              className="text-xl sm:text-2xl font-bold leading-tight text-black/30 truncate"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {customer.firstName} {customer.lastName}
            </h1>
            <p
              className="text-xs mt-0.5 truncate text-black/30"
              style={{ color: "rgba(225,226,233,0.5)" }}
            >
              {customer.email}
            </p>
            
          </div>
        </div>

      </div>
    </div>
  );
}
