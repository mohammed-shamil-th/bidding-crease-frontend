import Link from "next/link";
import Image from "next/image";
import logo from "@/assets/logo/logo.png";

export default function AppLogo({ href = "/" }) {
  return (
    <div className="flex-shrink-0">
      <Link href={href} className="block">
        <Image
          src={logo}
          alt="BiddingCrease Logo"
          width={200}
          height={60}
          className="h-10 sm:h-12 w-auto object-contain"
          priority
        />
      </Link>
    </div>
  );
}
