cd c:\Users\ABC\projects\NMW-Individual\artifacts\nutrimyway
pnpm run build:mobile
npx cap sync android
cd android
.\gradlew assembleDebug
