
import { SearchForm } from './SearchForm';

export function Hero() {
  return (
    <section id="home" className="relative h-[60vh] min-h-[450px] w-full">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=2070&auto=format&fit=crop')" }}
      >
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white px-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Find your next look
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-200">
          Discover and book the best barbers, stylists, and beauty professionals in your area.
        </p>
        <div className="mt-8 w-full max-w-4xl">
          <SearchForm />
        </div>
      </div>
    </section>
  );
}
