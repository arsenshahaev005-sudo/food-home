import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center">
      <Image src="/logo.svg" alt="Food&Home" width={440} height={70} className="object-contain h-18 w-auto" />
      <h1 className="text-4xl font-bold" style={{ color: "#4b2f23" }}>404</h1>
      <h2 className="text-xl" style={{ color: "#7c6b62" }}>Страница не найдена</h2>
      <p style={{ color: "#7c6b62" }}>
        К сожалению, запрашиваемая страница не существует.
      </p>
      <Link href="/" className="btn-warm mt-4 inline-block">
        Вернуться на главную
      </Link>
    </div>
  );
}
