import Link from "next/link";

export default function AppLogo() {
  return (
    <div className="flex-shrink-0">
      <Link
        href="/"
        className="text-2xl sm:text-3xl font-bold text-primary-600"
      >
        BiddingCrease
      </Link>
    </div>
  );
}
