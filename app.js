(() => {
  "use strict";

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const revealElements = $$(".reveal");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealElements.forEach((element) => observer.observe(element));
  } else {
    revealElements.forEach((element) => element.classList.add("is-visible"));
  }

  const heroVideo = $("#heroVideo");
  const videoLabel = $("#videoLabel");
  if (heroVideo) {
    const scenes = [
      { src: "https://videos.pexels.com/video-files/7584762/7584762-uhd_3840_2160_25fps.mp4", label: "Plumbing care in motion" },
      { src: "https://videos.pexels.com/video-files/6789905/6789905-uhd_3840_2160_25fps.mp4", label: "Carpentry care in motion" },
      { src: "https://videos.pexels.com/video-files/6079420/6079420-uhd_3840_2160_24fps.mp4", label: "Electrical care in motion" }
    ];
    let currentScene = 0;
    heroVideo.addEventListener("ended", () => {
      currentScene = (currentScene + 1) % scenes.length;
      heroVideo.src = scenes[currentScene].src;
      heroVideo.load();
      heroVideo.play().catch(() => {});
      if (videoLabel) videoLabel.textContent = scenes[currentScene].label;
    });
    heroVideo.addEventListener("error", () => {
      heroVideo.style.opacity = "0";
    }, { once: true });
  }

  const modal = $("[data-booking-modal]");
  if (!modal) return;

  const pageBody = document.body;
  const screens = $$("[data-screen]", modal);
  const progress = $$("[data-progress]", modal);
  const accountForm = $("#accountForm", modal);
  const requestForm = $("#requestForm", modal);
  const profileKey = "anyservice-profile";
  const state = {
    service: "Plumbing",
    speed: "scheduled",
    tier: "regular",
    profile: readProfile(),
    verificationRequested: false
  };

  function readProfile() {
    try {
      const stored = localStorage.getItem(profileKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  function saveProfile(profile) {
    state.profile = profile;
    try { localStorage.setItem(profileKey, JSON.stringify(profile)); } catch {}
  }

  function showScreen(name) {
    screens.forEach((screen) => screen.classList.toggle("is-hidden", screen.dataset.screen !== name));
    const order = ["account", "verify", "request"];
    const activeIndex = order.indexOf(name);
    progress.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
      item.classList.toggle("is-complete", index < activeIndex);
    });
  }

  function setButtonSelection(selector, selectedValue) {
    $$(selector, modal).forEach((button) => {
      const value = Object.values(button.dataset)[0];
      button.classList.toggle("is-selected", value === selectedValue);
    });
  }

  function syncRequestChoices() {
    setButtonSelection("[data-service-option]", state.service);
    setButtonSelection("[data-speed-option]", state.speed);
    setButtonSelection("[data-tier-option]", state.tier);
    const schedule = $(".schedule-fields", modal);
    const urgentMessage = $(".urgent-message", modal);
    const date = $("input[name=date]", modal);
    const time = $("input[name=time]", modal);
    const urgent = state.speed === "urgent";
    schedule.hidden = urgent;
    urgentMessage.classList.toggle("is-hidden", !urgent);
    date.required = !urgent;
    time.required = !urgent;
  }

  function openBooking(trigger) {
    state.service = trigger?.dataset.service || state.service;
    state.speed = trigger?.dataset.speed || state.speed;
    state.tier = trigger?.dataset.tier || state.tier;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    pageBody.classList.add("modal-open");
    const name = $("input[name=name]", modal);
    const email = $("input[name=email]", modal);
    const phone = $("input[name=phone]", modal);
    const address = $("textarea[name=address]", modal);
    if (state.profile) {
      name.value = state.profile.name || "";
      email.value = state.profile.email || "";
      phone.value = state.profile.phone || "";
      address.value = state.profile.address || "";
      showScreen(trigger?.hasAttribute("data-account-trigger") ? "account" : "verify");
    } else {
      showScreen("account");
    }
    syncRequestChoices();
    setTimeout(() => $(".booking-sheet", modal).focus?.(), 10);
  }

  function closeBooking() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    pageBody.classList.remove("modal-open");
  }

  $$('[data-book]').forEach((trigger) => trigger.addEventListener("click", () => openBooking(trigger)));
  $$('[data-close-booking]', modal).forEach((trigger) => trigger.addEventListener("click", closeBooking));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("is-open")) closeBooking(); });

  accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(accountForm);
    saveProfile(Object.fromEntries(form.entries()));
    showScreen("verify");
  });

  $("[data-request-verification]", modal).addEventListener("click", () => {
    state.verificationRequested = true;
    showScreen("request");
    syncRequestChoices();
  });
  $("[data-continue-standard]", modal).addEventListener("click", () => {
    state.verificationRequested = false;
    showScreen("request");
    syncRequestChoices();
  });

  $$('[data-service-option]', modal).forEach((button) => button.addEventListener("click", () => { state.service = button.dataset.serviceOption; syncRequestChoices(); }));
  $$('[data-speed-option]', modal).forEach((button) => button.addEventListener("click", () => { state.speed = button.dataset.speedOption; syncRequestChoices(); }));
  $$('[data-tier-option]', modal).forEach((button) => button.addEventListener("click", () => { state.tier = button.dataset.tierOption; syncRequestChoices(); }));

  const dateInput = $("input[name=date]", modal);
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(requestForm);
    const profile = state.profile || {};
    const timing = state.speed === "urgent"
      ? "Urgent — priority dispatch requested (higher price applies after acceptance)"
      : `${form.get("date")} at ${form.get("time")}`;
    const verification = state.verificationRequested
      ? "Secure verification requested — pending. This does not confirm verification."
      : "Standard member — no verification request made.";
    const lines = [
      "New AnyService request",
      "",
      `Name: ${profile.name || ""}`,
      `Email: ${profile.email || ""}`,
      `Mobile number: ${profile.phone || ""}`,
      `Service address: ${profile.address || ""}`,
      "",
      `Service: ${state.service}`,
      `Timing: ${timing}`,
      `Professional type: ${state.tier === "certified" ? "AnyServiceMen (higher certification)" : "Regular"}`,
      `Member status: ${verification}`,
      `Task details: ${form.get("details") || ""}`,
      "",
      "Sent from the AnyService launch-site request preview."
    ];
    const subject = encodeURIComponent(`AnyService request — ${state.service}`);
    const body = encodeURIComponent(lines.join("\n"));
    const link = $("[data-mailto-link]", modal);
    link.href = `mailto:AnyService.support@gmail.com?subject=${subject}&body=${body}`;
    const confirmation = $("[data-confirmation-copy]", modal);
    confirmation.textContent = `${state.service} request ready for ${state.speed === "urgent" ? "urgent priority dispatch" : "your chosen visit time"}. Send the email to share it with our team.`;
    showScreen("complete");
  });
})();

