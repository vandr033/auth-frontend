"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "../contexts/AdminAuthContext";
import { Calendar, Scissors, Users, TrendingUp } from "lucide-react";

export default function DashboardHomePage() {
    const { companyName, role, companySlug } = useAdminAuth();

    const stats = [
        {
            label: "Today's Bookings",
            value: "—",
            icon: <Calendar className="h-5 w-5" />,
            note: "Coming in Phase 3",
        },
        {
            label: "Total Services",
            value: "—",
            icon: <Scissors className="h-5 w-5" />,
            note: "Coming in Phase 3",
        },
        {
            label: "Staff Members",
            value: "—",
            icon: <Users className="h-5 w-5" />,
            note: "Coming in Phase 3",
        },
        {
            label: "This Week",
            value: "—",
            icon: <TrendingUp className="h-5 w-5" />,
            note: "Coming in Phase 3",
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">
                    Welcome back to {companyName}!
                </h2>
                <p className="text-slate-600">
                    Here is an overview of your salon. You are logged in as {role?.toLowerCase()}.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">
                                {stat.label}
                            </CardTitle>
                            <div className="text-slate-400">{stat.icon}</div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                            <p className="text-xs text-slate-500 mt-1">{stat.note}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Links */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="text-slate-600">
                    <p>
                        Use the sidebar to navigate to different sections. Full dashboard
                        functionality will be implemented in Phase 3.
                    </p>
                    {companySlug && (
                        <p className="mt-2">
                            Your public shop page:{" "}
                            <a
                                href={`/shop/${companySlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand hover:underline"
                            >
                                /shop/{companySlug}
                            </a>
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
