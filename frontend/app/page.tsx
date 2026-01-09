// frontend/app/page.tsx
import PixelOffice from "../components/PixelOffice";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 bg-black">
      {/* 渲染像素办公室组件 */}
      <PixelOffice />
    </main>
  );
}