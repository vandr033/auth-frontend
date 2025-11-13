import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { mockData } from "@/lib/data";

export default function Home() {
  return (
    <div className="relative w-full group/design-root">
      <div className="layout-container flex w-full flex-col">
        <Header />
        <main className="flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col max-w-7xl flex-1 px-4 sm:px-10 gap-8 sm:gap-12">
            {/* HeroSection */}
            <div className="@container">
              <div
                className="flex min-h-[520px] flex-col gap-6 bg-cover bg-center bg-no-repeat rounded-xl items-center justify-center p-4 text-center"
                style={{
                  backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.5) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBSrMN7r7sRtbOdiyhH3J7ms1tyZCCfNozpr3Hb68CG_JUtNV7X9eD0DmtOY8_ppm-W9X0Nktx7LtspqSTfRHzoRVrjJaZsw-XidNzATcozP9vbMimdVMk_Sd6q8CO0wrDSdA-R0upiQKZwbn0_QVObVfUtkDqi5xUwFQ16GiHSpsJnZ8rTSj2qkeG4Q7ApbTI6serr9A6xO6DSCYEqulPFYtbZtwAioF3RijaBt-rYkpLNly7hLtQVzyGjWqSagUyxKElyAr1zA8I")`,
                }}
              >
                <div className="flex flex-col gap-4">
                  <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] @[480px]:text-6xl">
                    {mockData.business.name}
                  </h1>
                  <h2 className="text-white text-base font-normal leading-normal @[480px]:text-lg">
                    ★★★★☆ ({mockData.business.rating}) {mockData.business.reviews}+
                    reviews • Downtown, Metropolis
                  </h2>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button size="lg" variant="primary">
                    Reserve Now
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-white/20 text-white backdrop-blur-sm border border-white/30 hover:bg-white/30"
                  >
                    View Prices
                  </Button>
                </div>
              </div>
            </div>
            {/* Stats/Quick Info Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <p className="text-base font-medium leading-normal text-text-light/70 dark:text-text-dark/70">
                  Status
                </p>
                <p className="tracking-light text-xl sm:text-2xl font-bold leading-tight text-green-600 dark:text-green-400">
                  Open
                </p>
              </Card>
              <Card>
                <p className="text-base font-medium leading-normal text-text-light/70 dark:text-text-dark/70">
                  Address
                </p>
                <p className="tracking-light text-xl sm:text-2xl font-bold leading-tight">
                  {mockData.business.address}
                </p>
              </Card>
              <Card>
                <p className="text-base font-medium leading-normal text-text-light/70 dark:text-text-dark/70">
                  Phone
                </p>
                <p className="tracking-light text-xl sm:text-2xl font-bold leading-tight">
                  {mockData.business.phone}
                </p>
              </Card>
              <Card>
                <p className="text-base font-medium leading-normal text-text-light/70 dark:text-text-dark/70">
                  Amenities
                </p>
                <div className="flex items-center gap-3 text-2xl font-bold leading-tight">
                  {mockData.business.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="material-symbols-outlined"
                      title={amenity}
                    >
                      {amenity.toLowerCase().replace(" ", "_")}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
            {/* About Us */}
            <div id="about">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">
                About Us
              </h2>
              <p className="text-base font-normal leading-normal pb-3 pt-1 text-text-light/90 dark:text-text-dark/90">
                Welcome to {mockData.business.name}, where we blend timeless
                techniques with contemporary styles. Our mission is to provide
                an unparalleled grooming experience, leaving you looking sharp
                and feeling confident. Step into our world of precision and
                craft.
              </p>
            </div>
            {/* Our Services */}
            <div id="services">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">
                Our Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockData.services.slice(0, 3).map((service) => (
                  <Card key={service.id}>
                    <h3 className="text-xl font-bold">{service.name}</h3>
                    <p className="text-base text-text-light/70 dark:text-text-dark/70">
                      {service.description}
                    </p>
                    <div className="flex justify-between items-center mt-auto pt-4">
                      <p className="text-lg font-bold text-primary">
                        ${service.price} • {service.duration} min
                      </p>
                      <Button size="sm">Book</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            {/* Our Team */}
            <div id="team">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">
                Meet Our Team
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {mockData.team.map((member) => (
                  <Card key={member.id} className="items-center text-center group">
                    <div
                      className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-32"
                      style={{ backgroundImage: `url("${member.image}")` }}
                    ></div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold">{member.name}</h3>
                      <p className="text-sm text-text-light/70 dark:text-text-dark/70">
                        {member.title}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full group-hover:bg-primary group-hover:text-white"
                    >
                      Book with {member.name.split(" ")[0]}
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
            {/* Reviews */}
            <div id="reviews">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">
                What Our Clients Say
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="items-center justify-center text-center">
                  <p className="text-4xl font-bold text-primary">
                    {mockData.business.rating}
                  </p>
                  <div className="flex text-yellow text-2xl">
                    <span className="material-symbols-outlined !fill-1">
                      star
                    </span>
                    <span className="material-symbols-outlined !fill-1">
                      star
                    </span>
                    <span className="material-symbols-outlined !fill-1">
                      star
                    </span>
                    <span className="material-symbols-outlined !fill-1">
                      star
                    </span>
                    <span className="material-symbols-outlined !fill-1">
                      star_half
                    </span>
                  </div>
                  <p className="text-sm text-text-light/70 dark:text-text-dark/70">
                    Based on {mockData.business.reviews}+ reviews
                  </p>
                </Card>
                <Card className="lg:col-span-2">
                  {mockData.reviews.map((review, index) => (
                    <div key={review.id}>
                      <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                          <div
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12"
                            style={{
                              backgroundImage: `url("${review.avatar}")`,
                            }}
                          ></div>
                          <div className="flex-1">
                            <p className="font-bold">{review.author}</p>
                            <p className="text-sm text-yellow">
                              {"★".repeat(review.rating)}
                            </p>
                          </div>
                        </div>
                        <p className="text-text-light/90 dark:text-text-dark/90">
                          "{review.comment}"
                        </p>
                      </div>
                      {index < mockData.reviews.length - 1 && (
                        <hr className="border-border-light dark:border-border-dark my-4" />
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            </div>
            {/* Location & Hours */}
            <div id="location">
              <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">
                Location & Hours
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.298991206121!2d-73.98823548459398!3d40.75544797932715!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25855c656515b%3A0x35b1d43a1894add1!2sTimes%20Square!5e0!3m2!1sen!2sus!4v1676391442123!5m2!1sen!2sus"
                    width="100%"
                    height="450"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
                <Card>
                  <h3 className="text-xl font-bold">Opening Hours</h3>
                  <ul className="space-y-3 text-text-light/90 dark:text-text-dark/90">
                    {mockData.business.hours.map((item) => (
                      <li key={item.day} className="flex justify-between">
                        <span>{item.day}</span>
                        <span>{item.hours}</span>
                      </li>
                    ))}
                  </ul>
                  <Button size="md" className="w-full mt-auto">
                    Get Directions
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
