(function () {
  // 1. Instant Preloader Dismissal (Guarantees zero blocking of scroll or clicks)
  const preloader = document.getElementById("preloader");
  if (preloader) {
    preloader.style.opacity = "0";
    preloader.style.pointerEvents = "none";
    setTimeout(() => {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 300);
  }

  // 2. Lenis Smooth Scroll Setup with Safe Fallback
  let lenis = null;
  if (typeof Lenis !== "undefined") {
    try {
      lenis = new Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.2,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    } catch (e) {
      console.warn(
        "Lenis smooth scroll fallback to native smooth scrolling:",
        e,
      );
    }
  }

  // 3. Theme Toggle Setup
  const themeToggleBtn = document.getElementById("theme-toggle");
  const darkIcon = document.getElementById("theme-icon-dark");
  const lightIcon = document.getElementById("theme-icon-light");

  function updateThemeIcons(isLight) {
    if (isLight) {
      lightIcon.classList.add("hidden");
      darkIcon.classList.remove("hidden");
    } else {
      lightIcon.classList.remove("hidden");
      darkIcon.classList.add("hidden");
    }
  }

  // Load saved theme or default to light (Pin on ui warm theme)
  const savedTheme = localStorage.getItem("securegen_theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    updateThemeIcons(false);
  } else {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    updateThemeIcons(true);
  }

  themeToggleBtn.addEventListener("click", () => {
    const isCurrentlyLight =
      document.documentElement.classList.contains("light");
    if (isCurrentlyLight) {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("securegen_theme", "dark");
      updateThemeIcons(false);
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.setItem("securegen_theme", "light");
      updateThemeIcons(true);
    }
  });

  // 4. Mobile Menu Toggle
  const mobileBtn = document.getElementById("mobile-menu-btn");
  const mobileNav = document.getElementById("mobile-nav");
  if (mobileBtn && mobileNav) {
    mobileBtn.addEventListener("click", () => {
      mobileNav.classList.toggle("hidden");
    });
    document.querySelectorAll(".mobile-link").forEach((link) => {
      link.addEventListener("click", () => mobileNav.classList.add("hidden"));
    });
  }

  // 5. Ambient Cursor Follower (Desktop only)
  const cursorLight = document.getElementById("cursor-light");
  if (cursorLight && window.matchMedia("(pointer: fine)").matches) {
    window.addEventListener("mousemove", (e) => {
      cursorLight.style.left = e.clientX + "px";
      cursorLight.style.top = e.clientY + "px";
    });
  }

  // 6. Cryptographic Characters Definition
  const CHARSETS = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  };
  const AMBIGUOUS_CHARS = ["O", "0", "I", "l", "1", "|"];

  // Elements
  const lengthSlider = document.getElementById("length-slider");
  const lengthNumber = document.getElementById("length-number");
  const passwordDisplay = document.getElementById("password-display");
  const charCountBadge = document.getElementById("char-count-badge");
  const copyBtn = document.getElementById("copy-password-btn");
  const copyText = document.getElementById("copy-text");
  const copyStatus = document.getElementById("copy-status");
  const regenerateBtn = document.getElementById("regenerate-btn");
  const toggleMaskBtn = document.getElementById("toggle-mask-btn");
  const eyeIconShow = document.getElementById("eye-icon-show");
  const eyeIconHide = document.getElementById("eye-icon-hide");
  const mainGenerateBtn = document.getElementById("main-generate-btn");
  const validationError = document.getElementById("validation-error");

  // Checkboxes
  const optUpper = document.getElementById("opt-uppercase");
  const optLower = document.getElementById("opt-lowercase");
  const optNumbers = document.getElementById("opt-numbers");
  const optSymbols = document.getElementById("opt-symbols");
  const optAmbiguous = document.getElementById("opt-ambiguous");
  const optNoDuplicates = document.getElementById("opt-no-duplicates");
  const optCustomExclude = document.getElementById("opt-custom-exclude");

  // Advanced Toggle
  const toggleAdvancedBtn = document.getElementById("toggle-advanced-btn");
  const advancedPanel = document.getElementById("advanced-options-panel");
  const advancedChevron = document.getElementById("advanced-chevron");

  toggleAdvancedBtn.addEventListener("click", () => {
    advancedPanel.classList.toggle("hidden");
    advancedChevron.classList.toggle("rotate-180");
  });

  // Synchronize Slider and Number Input
  lengthSlider.addEventListener("input", (e) => {
    lengthNumber.value = e.target.value;
    generatePassword();
  });

  lengthNumber.addEventListener("input", (e) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val)) return;
    if (val < 4) val = 4;
    if (val > 64) val = 64;
    lengthSlider.value = val;
    generatePassword();
  });

  // Character Exclusion & Checkbox Listeners
  [
    optUpper,
    optLower,
    optNumbers,
    optSymbols,
    optAmbiguous,
    optNoDuplicates,
  ].forEach((el) => {
    el.addEventListener("change", generatePassword);
  });
  optCustomExclude.addEventListener("input", generatePassword);

  // Mask/Unmask Toggle
  let isMasked = false;
  let rawPassword = "";

  toggleMaskBtn.addEventListener("click", () => {
    isMasked = !isMasked;
    if (isMasked) {
      passwordDisplay.type = "password";
      eyeIconShow.classList.add("hidden");
      eyeIconHide.classList.remove("hidden");
    } else {
      passwordDisplay.type = "text";
      eyeIconShow.classList.remove("hidden");
      eyeIconHide.classList.add("hidden");
    }
  });

  // Secure Random Integer Generator without Modulo Bias
  function getSecureRandomInt(max) {
    if (max <= 1) return 0;
    const bitsNeeded = Math.ceil(Math.log2(max));
    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    const mask = (1 << bitsNeeded) - 1;
    const array = new Uint8Array(bytesNeeded);

    while (true) {
      window.crypto.getRandomValues(array);
      let val = 0;
      for (let i = 0; i < bytesNeeded; i++) {
        val = (val << 8) | array[i];
      }
      val = val & mask;
      if (val < max) {
        return val;
      }
    }
  }

  // Fisher-Yates Cryptographic Shuffle
  function secureShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = getSecureRandomInt(i + 1);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  // Generate Cryptographic Password
  function generatePassword() {
    const length = parseInt(lengthSlider.value, 10);
    const useUpper = optUpper.checked;
    const useLower = optLower.checked;
    const useNumbers = optNumbers.checked;
    const useSymbols = optSymbols.checked;
    const excludeAmbiguous = optAmbiguous.checked;
    const avoidDuplicates = optNoDuplicates.checked;
    const customExcludes = optCustomExclude.value;

    // Validation Check
    if (!useUpper && !useLower && !useNumbers && !useSymbols) {
      validationError.classList.remove("hidden");
      passwordDisplay.value = "--- Select At Least One Category ---";
      return;
    }
    validationError.classList.add("hidden");

    // Build Active Pools
    let guaranteedChars = [];
    let pool = "";

    function cleanCategory(charset) {
      let filtered = charset;
      if (excludeAmbiguous) {
        filtered = filtered
          .split("")
          .filter((c) => !AMBIGUOUS_CHARS.includes(c))
          .join("");
      }
      if (customExcludes) {
        filtered = filtered
          .split("")
          .filter((c) => !customExcludes.includes(c))
          .join("");
      }
      return filtered;
    }

    const validUpper = useUpper ? cleanCategory(CHARSETS.upper) : "";
    const validLower = useLower ? cleanCategory(CHARSETS.lower) : "";
    const validNum = useNumbers ? cleanCategory(CHARSETS.numbers) : "";
    const validSym = useSymbols ? cleanCategory(CHARSETS.symbols) : "";

    // Add at least one guaranteed character from each checked pool
    if (validUpper)
      guaranteedChars.push(validUpper[getSecureRandomInt(validUpper.length)]);
    if (validLower)
      guaranteedChars.push(validLower[getSecureRandomInt(validLower.length)]);
    if (validNum)
      guaranteedChars.push(validNum[getSecureRandomInt(validNum.length)]);
    if (validSym)
      guaranteedChars.push(validSym[getSecureRandomInt(validSym.length)]);

    pool = validUpper + validLower + validNum + validSym;

    if (pool.length === 0) {
      passwordDisplay.value = "Pool empty (check exclusions)";
      return;
    }

    let passwordArray = [...guaranteedChars];

    if (avoidDuplicates) {
      let poolArr = pool.split("").filter((c) => !passwordArray.includes(c));
      while (passwordArray.length < length && poolArr.length > 0) {
        const idx = getSecureRandomInt(poolArr.length);
        passwordArray.push(poolArr[idx]);
        poolArr.splice(idx, 1);
      }
    } else {
      while (passwordArray.length < length) {
        const idx = getSecureRandomInt(pool.length);
        passwordArray.push(pool[idx]);
      }
    }

    // Shuffle securely
    secureShuffle(passwordArray);
    rawPassword = passwordArray.slice(0, length).join("");
    passwordDisplay.value = rawPassword;
    charCountBadge.textContent = `${length} Characters`;

    // Update AI target card
    const aiTarget = document.getElementById("ai-active-target");
    if (aiTarget) aiTarget.textContent = rawPassword;

    // Calculate and Render Strength & Shannon Entropy
    updateEntropyAndStrength(rawPassword, pool.length, length);
  }

  // Entropy & Strength Calculation
  function updateEntropyAndStrength(pwd, poolSize, length) {
    if (!pwd || pwd.length === 0 || poolSize <= 0) return;

    // Shannon Entropy: H = L * log2(N)
    const entropy = (length * Math.log2(poolSize)).toFixed(1);
    document.getElementById("entropy-value").textContent = `${entropy} bits`;

    // Telemetry update
    const telemetryPool = document.getElementById("telemetry-pool");
    const telemetryLength = document.getElementById("telemetry-length");
    const telemetryCombos = document.getElementById("telemetry-combos");
    const telemetryLengthBar = document.getElementById("telemetry-length-bar");

    if (telemetryPool) telemetryPool.textContent = `${poolSize} Characters`;
    if (telemetryLength) telemetryLength.textContent = `${length} Characters`;
    if (telemetryLengthBar)
      telemetryLengthBar.style.width = `${Math.min(100, (length / 64) * 100)}%`;
    if (telemetryCombos) {
      const power = (length * Math.log10(poolSize)).toFixed(1);
      telemetryCombos.textContent = `~ 10^${power}`;
    }

    // Strength Heuristic Assessment
    const strengthLabel = document.getElementById("strength-label");
    const crackTime = document.getElementById("crack-time");
    const meters = [
      document.getElementById("meter-1"),
      document.getElementById("meter-2"),
      document.getElementById("meter-3"),
      document.getElementById("meter-4"),
      document.getElementById("meter-5"),
    ];

    let score = 1;
    let crackDesc = "Instant";
    let labelText = "Very Weak";
    let activeColor = "bg-rose-500";

    if (entropy > 85 && length >= 14) {
      score = 5;
      labelText = "Cryptographic Fortress";
      crackDesc = "> 100 Trillion Centuries";
      activeColor = "bg-emerald-400";
    } else if (entropy >= 70 && length >= 12) {
      score = 4;
      labelText = "Strong";
      crackDesc = "~ 4.8 Million Years";
      activeColor = "bg-cyan-400";
    } else if (entropy >= 50 && length >= 10) {
      score = 3;
      labelText = "Fair";
      crackDesc = "~ 8 Months";
      activeColor = "bg-indigo-400";
    } else if (entropy >= 35) {
      score = 2;
      labelText = "Weak";
      crackDesc = "~ 2 Hours";
      activeColor = "bg-amber-400";
    } else {
      score = 1;
      labelText = "Very Weak";
      crackDesc = "< 5 Seconds";
      activeColor = "bg-rose-500";
    }

    strengthLabel.textContent = labelText;
    strengthLabel.className = `font-bold font-mono-code uppercase tracking-wider text-${activeColor.replace("bg-", "")}`;
    crackTime.textContent = crackDesc;

    meters.forEach((m, idx) => {
      m.className = "h-full rounded-full transition-colors duration-300";
      if (idx < score) {
        m.classList.add(activeColor);
      } else {
        m.classList.add("bg-stone-200", "dark:bg-stone-800");
      }
    });
  }

  // Copy-To-Clipboard with Cross-Frame Fallback
  copyBtn.addEventListener("click", () => {
    if (!rawPassword) return;

    let copied = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(rawPassword)
        .then(() => {
          handleCopySuccess();
        })
        .catch(() => {
          fallbackExecCommandCopy();
        });
    } else {
      fallbackExecCommandCopy();
    }

    function fallbackExecCommandCopy() {
      try {
        passwordDisplay.select();
        document.execCommand("copy");
        handleCopySuccess();
      } catch (err) {
        console.error("Copy fallback failed", err);
      }
    }

    function handleCopySuccess() {
      copyText.textContent = "Copied!";
      copyBtn.classList.replace("bg-cyan-500", "bg-emerald-400");
      copyStatus.classList.remove("hidden");
      setTimeout(() => {
        copyText.textContent = "Copy";
        copyBtn.classList.replace("bg-emerald-400", "bg-cyan-500");
        copyStatus.classList.add("hidden");
      }, 2500);
    }
  });

  // Regenerate Button
  regenerateBtn.addEventListener("click", generatePassword);
  mainGenerateBtn.addEventListener("click", generatePassword);

  // Presets Handler
  document.querySelectorAll(".preset-card").forEach((card) => {
    card.addEventListener("click", () => {
      const len = parseInt(card.getAttribute("data-len"), 10);
      const upper = card.getAttribute("data-upper") === "true";
      const lower = card.getAttribute("data-lower") === "true";
      const num = card.getAttribute("data-num") === "true";
      const sym = card.getAttribute("data-sym") === "true";
      const amb = card.getAttribute("data-amb") === "true";

      lengthSlider.value = len;
      lengthNumber.value = len;
      optUpper.checked = upper;
      optLower.checked = lower;
      optNumbers.checked = num;
      optSymbols.checked = sym;
      optAmbiguous.checked = amb;
      optNoDuplicates.checked = false;

      generatePassword();

      // Smooth scroll to generator
      if (lenis) {
        lenis.scrollTo("#generator-section", { duration: 1 });
      } else {
        document
          .getElementById("generator-section")
          .scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // FAQ Accordion Behavior
  const faqButtons = document.querySelectorAll(".faq-question");
  faqButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const chevron = btn.querySelector(".faq-chevron");
      const isExpanded = btn.getAttribute("aria-expanded") === "true";

      faqButtons.forEach((other) => {
        if (other !== btn) {
          other.setAttribute("aria-expanded", "false");
          other.nextElementSibling.classList.add("hidden");
          const c = other.querySelector(".faq-chevron");
          if (c) c.classList.remove("rotate-180");
        }
      });

      if (isExpanded) {
        btn.setAttribute("aria-expanded", "false");
        answer.classList.add("hidden");
        chevron.classList.remove("rotate-180");
      } else {
        btn.setAttribute("aria-expanded", "true");
        answer.classList.remove("hidden");
        chevron.classList.add("rotate-180");
      }
    });
  });

  // Back to top button
  const backToTopBtn = document.getElementById("back-to-top");
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  // 7. Gemini AI Lab Features (Client-side Simulation with instant interactive responses)
  const btnMnemonic = document.getElementById("btn-generate-mnemonic");
  const mnemonicOutput = document.getElementById("ai-mnemonic-output");
  const btnPassphrase = document.getElementById("btn-generate-passphrase");
  const passphraseOutput = document.getElementById("ai-passphrase-output");
  const passphraseSelect = document.getElementById("passphrase-theme-select");
  const btnAdvisor = document.getElementById("btn-ask-advisor");
  const advisorInput = document.getElementById("advisor-query-input");
  const advisorOutput = document.getElementById("ai-advisor-output");

  // AI Mnemonic Story Synthesizer
  btnMnemonic.addEventListener("click", () => {
    mnemonicOutput.innerHTML =
      '<span class="text-cyan-400 font-mono-code animate-pulse">Gemini synthesizing memory palace...</span>';

    setTimeout(() => {
      const chars = rawPassword.slice(0, 6).split("");
      const stories = [
        `Imagine: "${chars[0] || "X"}" is an eXtreme neon gate, guarded by "${chars[1] || "7"}" silver robots holding "${chars[2] || "k"}"ite shields next to "${chars[3] || "9"}" glowing beacons.`,
        `Visual Anchor: A "${chars[0] || "A"}"stronaut jumping over "${chars[1] || "8"}" asteroids while carrying a "${chars[2] || "z"}"ebra across "${chars[3] || "#"}" laser barriers.`,
        `Palace Hook: At room "${chars[0] || "K"}", you find "${chars[1] || "4"}" crystal keys unlocking "${chars[2] || "m"}"ystic doors with code "${chars[3] || "!"}"`.replace(
          /\\/g,
          "",
        ),
      ];
      const chosen = stories[getSecureRandomInt(stories.length)];
      mnemonicOutput.innerHTML = `<span class="text-white not-italic font-medium">${chosen}</span>`;
    }, 600);
  });

  // AI Thematic Passphrase Generator
  const THEMES = {
    "Cyberpunk Security": [
      "neon",
      "glitch",
      "matrix",
      "cipher",
      "protocol",
      "daemon",
      "firewall",
      "subroutine",
    ],
    "Deep Space Astrophysics": [
      "quasar",
      "nebula",
      "singularity",
      "pulsar",
      "orbital",
      "zenith",
      "supernova",
      "horizon",
    ],
    "Quantum Computing & Physics": [
      "entangled",
      "photon",
      "superposition",
      "qubit",
      "fermion",
      "lattice",
      "hadron",
      "quantum",
    ],
    "Ancient Mythology & Legends": [
      "valkyrie",
      "olympus",
      "chimera",
      "phoenix",
      "titan",
      "aegis",
      "hyperion",
      "excalibur",
    ],
  };

  btnPassphrase.addEventListener("click", () => {
    passphraseOutput.innerHTML =
      '<span class="text-cyan-400 font-mono-code animate-pulse">Synthesizing...</span>';

    setTimeout(() => {
      const domain = passphraseSelect.value;
      const words = THEMES[domain] || THEMES["Cyberpunk Security"];
      const selected = [];
      for (let i = 0; i < 4; i++) {
        selected.push(words[getSecureRandomInt(words.length)]);
      }
      const randomDigit = getSecureRandomInt(99) + 1;
      const phrase = `${selected.join("-")}-${randomDigit}`;
      passphraseOutput.innerHTML = `
            <span class="text-cyan-300 font-bold text-sm tracking-wide">${phrase}</span>
            <span class="text-[10px] text-slate-400 mt-1">Diceware Entropy: ~79.2 bits &bull; 4 Words</span>
          `;
    }, 500);
  });

  // AI Cyber Advisor Terminal
  function handleAdvisorQuery(question) {
    if (!question.trim()) return;
    advisorOutput.innerHTML =
      '<span class="text-indigo-400 font-mono-code animate-pulse">Consulting Gemini threat engine...</span>';

    setTimeout(() => {
      let reply = "";
      const q = question.toLowerCase();
      if (q.includes("argon") || q.includes("bcrypt") || q.includes("hash")) {
        reply =
          "<strong>Argon2id</strong> is the current IETF standard winner (Memory-Hard). Unlike MD5 or SHA-256 which are vulnerable to GPU parallelism, Argon2id requires dedicated RAM buffers per hash attempt, thwarting custom ASIC rigs.";
      } else if (
        q.includes("crack") ||
        q.includes("16") ||
        q.includes("time")
      ) {
        reply =
          "A true CSPRNG 16-character password with mixed cases, numbers, and symbols has over <strong>105 bits of Shannon entropy</strong> (3.7 × 10²⁸ permutations). Even with 10,000 RTX 4090 GPUs, cracking takes millions of years.";
      } else {
        reply = `<strong>Security Assessment:</strong> Always pair high-entropy passwords with <strong>FIDO2 WebAuthn / Passkeys</strong> or hardware U2F tokens. Defense in depth ensures that even if credentials leak in an external breach, secondary factors prevent unauthorized entry.`;
      }
      advisorOutput.innerHTML = `<div class="text-slate-200">${reply}</div>`;
    }, 600);
  }

  btnAdvisor.addEventListener("click", () => {
    handleAdvisorQuery(advisorInput.value);
  });

  advisorInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAdvisorQuery(advisorInput.value);
  });

  document.querySelectorAll(".quick-ask-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      advisorInput.value = btn.textContent;
      handleAdvisorQuery(btn.textContent);
    });
  });

  // Initial Key Generation On Load
  generatePassword();
})();
