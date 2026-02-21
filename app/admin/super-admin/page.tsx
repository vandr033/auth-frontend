"use client";

import Link from "next/link";
import { Tags, ArrowRight, Store } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SuperAdminDashboard() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
                <p className="text-slate-500">Manage global system settings and configurations</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Store className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Shops</CardTitle>
                                <CardDescription>Manage all shops</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 mb-4">
                            Create new shops, manage users, and configure shop settings.
                        </p>
                        <Link href="/admin/super-admin/shops">
                            <Button variant="outline" className="w-full">
                                Manage Shops
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                                <Tags className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Service Types</CardTitle>
                                <CardDescription>Manage global service types</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 mb-4">
                            Create and manage global service types that salons can use to categorize their services.
                        </p>
                        <Link href="/admin/super-admin/service-types">
                            <Button variant="outline" className="w-full">
                                Manage Service Types
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
