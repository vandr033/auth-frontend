"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu"
// If you installed lucide-react:
import { Menu, X } from "lucide-react"
import { useState } from "react"

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">

        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="https://cdn-icons-png.flaticon.com/512/7641/7641727.png"
            alt="logo"
            width={32}
            height={32}
            priority
          />
          <span className="text-lg font-semibold text-gray-900">The Dapper Cut</span>
        </Link>

        {/* Center: Desktop nav (NavigationMenu) */}
        <div className="hidden md:block">
          <NavigationMenu>
            <NavigationMenuList className="gap-8 text-sm font-medium">
              <NavigationMenuItem>
                <Link href="#services" legacyBehavior passHref>
                  <NavigationMenuLink className="text-gray-700 hover:text-black">
                    Services
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent px-0 text-gray-700 hover:bg-transparent hover:text-black">
                  Book Now
                </NavigationMenuTrigger>
                <NavigationMenuContent className="p-3">
                  <ul className="grid w-[260px] gap-2">
                    <li>
                      <Link href="#book/haircut" className="block rounded-md p-2 hover:bg-accent">
                        Haircut
                      </Link>
                    </li>
                    <li>
                      <Link href="#book/shave" className="block rounded-md p-2 hover:bg-accent">
                        Shave
                      </Link>
                    </li>
                    <li>
                      <Link href="#book/beard" className="block rounded-md p-2 hover:bg-accent">
                        Beard Trim
                      </Link>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="#about" legacyBehavior passHref>
                  <NavigationMenuLink className="text-[#C89E75]">
                    About Us
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link href="#contact" legacyBehavior passHref>
                  <NavigationMenuLink className="text-gray-700 hover:text-black">
                    Contact
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: Desktop actions */}
        <div className="hidden md:flex items-center gap-4">
          <Button className="rounded-md bg-blue-600 px-6 hover:bg-blue-700">
            Reserve Now
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>

        {/* Mobile: Reserve + Hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <Button className="h-9 rounded-md bg-blue-600 px-4 text-xs font-semibold hover:bg-blue-700">
            Reserve
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                {/* If lucide-react installed, use icons; otherwise SVG fallback */}
                {Menu ? <Menu className="h-5 w-5" /> : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 py-4 text-sm font-medium">
                <Link href="#services" onClick={() => setOpen(false)} className="text-gray-700">Services</Link>
                <Link href="#book" onClick={() => setOpen(false)} className="text-gray-700">Book Now</Link>
                <Link href="#about" onClick={() => setOpen(false)} className="text-[#C89E75]">About Us</Link>
                <Link href="#contact" onClick={() => setOpen(false)} className="text-gray-700">Contact</Link>

                <Separator />

                <Button onClick={() => setOpen(false)} className="rounded-md bg-blue-600 hover:bg-blue-700">
                  Reserve Now
                </Button>

                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="https://randomuser.me/api/portraits/men/32.jpg" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">Guest</div>
                    <div className="text-muted-foreground">guest@example.com</div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
