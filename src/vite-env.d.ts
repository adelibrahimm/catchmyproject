/// <reference types="vite/client" />

// Vite ?url import suffix - returns a URL string
declare module '*?url' {
    const src: string;
    export default src;
}
