
"use client";

import { Menu, Scissors } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useT } from '@/lib/i18n';

export function Header() {
  const t = useT();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Scissors className="h-6 w-6 text-blue-600" />
          <span>{t('header.brand')}</span>
        </Link>

        {/* Desktop Navigation */}
        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  {t('header.home')}
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/how-it-works" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  {t('header.howItWorks')}
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/for-professionals" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                  {t('header.forProfessionals')}
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost">{t('header.logIn')}</Button>
          <Button>{t('header.signUp')}</Button>
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://github.com/shadcn.png" alt={t('homeNavbar.profileAvatar')} />
            <AvatarFallback>{t('mainNavbar.user').charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{t('header.openMenu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="grid gap-4 p-4">
                <Link href="/" className="font-semibold">{t('header.home')}</Link>
                <Link href="/how-it-works" className="font-semibold">{t('header.howItWorks')}</Link>
                <Link href="/for-professionals" className="font-semibold">{t('header.forProfessionals')}</Link>
                <div className="flex flex-col gap-2 mt-4">
                    <Button variant="ghost">{t('header.logIn')}</Button>
                    <Button>{t('header.signUp')}</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
