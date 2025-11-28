
import { Scissors } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-lg">ClipBook</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/terms" className="hover:text-blue-600 hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-blue-600 hover:underline">Privacy Policy</Link>
            <Link href="/support" className="hover:text-blue-600 hover:underline">Support</Link>
            <Link href="/contact" className="hover:text-blue-600 hover:underline">Contact</Link>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} ClipBook. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
