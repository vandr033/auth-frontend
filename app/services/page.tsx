import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { mockData } from "@/lib/data";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function ServicesPage() {
  const categories = [
    ...new Set(mockData.services.map((service) => service.category)),
  ];

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <Header />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 md:py-12">
        <div className="flex flex-wrap justify-between gap-3 mb-8">
          <h1 className="text-gray-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">
            Services & Pricing
          </h1>
        </div>
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          <aside className="lg:w-1/4 lg:sticky lg:top-28 self-start">
            <nav className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
                Categories
              </h3>
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`#${category.toLowerCase()}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {category}
                </Link>
              ))}
            </nav>
          </aside>
          <div className="lg:w-3/4 flex flex-col gap-10">
            {categories.map((category) => (
              <section key={category} id={category.toLowerCase()}>
                <h2 className="text-gray-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5 border-b border-gray-200 dark:border-gray-800 mb-6">
                  {category}
                </h2>
                <div className="space-y-4">
                  {mockData.services
                    .filter((service) => service.category === category)
                    .map((service) => (
                      <div
                        key={service.id}
                        className="bg-white dark:bg-background-dark p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="flex-grow">
                          <p className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                            {service.name}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal mt-1">
                            {service.description}
                          </p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col sm:items-end gap-2">
                          <p className="text-gray-800 dark:text-gray-200 text-base font-semibold">
                            ${service.price} • {service.duration} min
                          </p>
                          <Button size="sm" variant="ghost">
                            Book
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
