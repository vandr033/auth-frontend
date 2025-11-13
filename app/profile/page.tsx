"use client";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { mockData } from "@/lib/data";
import Button from "@/components/ui/Button";

export default function ProfilePage() {
  const { user } = mockData;

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex w-full grow flex-col">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">My Profile</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <div className="bg-white dark:bg-background-dark p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold mb-4">Your Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Name
                    </label>
                    <p>{user.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Email
                    </label>
                    <p>{user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Phone
                    </label>
                    <p>{user.phone}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full">
                    Edit Profile
                  </Button>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="bg-white dark:bg-background-dark p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold mb-4">
                  Upcoming Reservations
                </h2>
                <div className="space-y-4">
                  {user.reservations.future.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 border rounded-lg border-gray-200 dark:border-gray-700"
                    >
                      <p className="font-bold">{res.service}</p>
                      <p>
                        with {res.staff} on {res.date} at {res.time}
                      </p>
                      <p className="text-sm text-green-500">{res.status}</p>
                    </div>
                  ))}
                </div>
                <h2 className="text-xl font-bold mt-8 mb-4">
                  Past Reservations
                </h2>
                <div className="space-y-4">
                  {user.reservations.past.map((res) => (
                    <div
                      key={res.id}
                      className="p-4 border rounded-lg border-gray-200 dark:border-gray-700"
                    >
                      <p className="font-bold">{res.service}</p>
                      <p>
                        with {res.staff} on {res.date} at {res.time}
                      </p>
                      <p className="text-sm text-gray-500">{res.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
