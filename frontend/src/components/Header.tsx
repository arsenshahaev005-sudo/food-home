import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import CartMenu from "@/components/CartMenu";
import AddressCapsule from "@/components/AddressCapsule";
import SearchBar from "@/components/SearchBar";
import ProfileMenu from "@/components/ProfileMenu";

export default async function Header() {
  const token = (await cookies()).get("accessToken")?.value;
  return (
    <header
      className="sticky top-0 z-30"
      style={{ backgroundColor: "#fdf6ef", boxShadow: "var(--shadow-soft)" }}
    >
      <div className="mx-auto max-w-6xl px-4 h-20 flex items-center gap-6">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image 
            src="/logo.svg" 
            alt="Food&Home" 
            width={200} 
            height={32} 
            className="object-contain h-8 w-auto"
            priority
          />
        </Link>

        <div className="flex-1">
          <SearchBar />
        </div>

        <nav className="flex items-center gap-3 text-sm">
          <AddressCapsule />
          <CartMenu token={token} />
          <ProfileMenu token={token} />
        </nav>
      </div>
    </header>
  );
}
