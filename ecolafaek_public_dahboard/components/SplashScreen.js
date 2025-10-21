import { useEffect, useState } from "react";
import Image from "next/image";
import styles from "./SplashScreen.module.css";

const SplashScreen = ({ onComplete }) => {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setSlide(1), 100), // Slide 1: Green background appears
      setTimeout(() => setSlide(2), 1200), // Slide 2: Logo + Brand name
      setTimeout(() => setSlide(3), 4200), // Slide 3: Mission statement
      setTimeout(() => setSlide(4), 7500), // Slide 4: Environmental emojis surprise
      setTimeout(() => onComplete(), 12500), // Complete after 5 seconds of emojis
    ];

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [onComplete]);

  return (
    <div
      className={`${styles.splashContainer} ${
        slide >= 1 ? styles.greenBg : ""
      } ${slide === 4 ? styles.slideOpen : ""}`}
    >
      {/* Slide 2: Logo and Brand */}
      {slide >= 2 && slide < 3 && (
        <div className={`${styles.slideContent} ${styles.fadeIn} ${slide === 3 ? styles.slideOutUp : ''}`}>
          <div className={styles.logoCentered}>
            <Image
              src="/app_logo.webp"
              alt="EcoLafaek Logo"
              width={200}
              height={200}
              className={styles.logoImage}
              priority
            />
          </div>
          <h1 className={styles.brandTitle}>ECOLAFAEK</h1>
        </div>
      )}

      {/* Slide 3: Mission Statement */}
      {slide >= 3 && slide < 4 && (
        <div className={`${styles.slideContent} ${styles.slideInFromBottom}`}>
          <div className={styles.missionContent}>
            <div className={styles.logoSmall}>
              <Image
                src="/app_logo.webp"
                alt="EcoLafaek Logo"
                width={120}
                height={120}
                className={styles.logoImage}
                priority
              />
            </div>
            <h2 className={styles.brandTitleSmall}>ECOLAFAEK</h2>
            <div className={styles.missionText}>
              <p className={styles.missionLine}>
                Empowering sustainable communities,
              </p>
              <p className={styles.missionLine}>
                building the next generation of
              </p>
              <p className={styles.heroText}>eco-heroes.</p>
            </div>
          </div>
        </div>
      )}

      {/* Slide 4: Environmental Emojis Animation */}
      {slide === 4 && (
        <div className={styles.emojiContainer}>
          <span className={`${styles.emoji} ${styles.emoji1}`}>🌍</span>
          <span className={`${styles.emoji} ${styles.emoji2}`}>♻️</span>
          <span className={`${styles.emoji} ${styles.emoji3}`}>🌱</span>
          <span className={`${styles.emoji} ${styles.emoji4}`}>🌳</span>
          <span className={`${styles.emoji} ${styles.emoji5}`}>💚</span>
          <span className={`${styles.emoji} ${styles.emoji6}`}>🗑️</span>
          <span className={`${styles.emoji} ${styles.emoji7}`}>🌿</span>
          <span className={`${styles.emoji} ${styles.emoji8}`}>☀️</span>
          <span className={`${styles.emoji} ${styles.emoji9}`}>💧</span>
          <span className={`${styles.emoji} ${styles.emoji10}`}>🍃</span>
        </div>
      )}
    </div>
  );
};

export default SplashScreen;
