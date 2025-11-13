import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { mockData } from "@/lib/data";

export default function AboutPage() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <Header />
      <main className="px-4 md:px-10 lg:px-20 py-8 lg:py-16">
        <div className="max-w-5xl mx-auto flex flex-col gap-12 lg:gap-20">
          {/* HeroSection */}
          <div className="w-full">
            <div
              className="flex min-h-[360px] md:min-h-[480px] flex-col gap-6 bg-cover bg-center bg-no-repeat rounded-xl items-center justify-center p-4 text-center"
              style={{
                backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.5) 100%), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBQV5eSjnO4cALLK790Axc3nrpN7tfihENDb0LNyKjv-riAaK663t0IQxKsT51DYbhPFsyxEpVgYE9ArlYyf4Vtjrjl9IRfUytHxQ1jPslwmZtuTG91HZluZFvXD8iGpuyeZaLBHwR73QX50G1ltsSXnjL_0yAWu2LAGQxWzOr4v7pett5eN2UvyRquXAsOXIJk5DeF5cwtYzgxByrk0r1Lkd5sY9n_LnqDeuyx-nhc6rFrRAh2TZ0Po8tl3VdMXRkN36ii5WKqP1I")`,
              }}
            >
              <div className="flex flex-col gap-2">
                <h1 className="text-white text-4xl font-black leading-tight tracking-[-0.033em] md:text-5xl">
                  About {mockData.business.name}
                </h1>
                <p className="text-white text-base font-normal leading-normal md:text-lg">
                  Experience the art of modern grooming and classic style in the
                  heart of the city.
                </p>
              </div>
            </div>
          </div>
          {/* Our Story Section */}
          <section>
            <h2 className="text-charcoal dark:text-gray-100 text-3xl font-bold leading-tight tracking-[-0.015em] px-4 pb-4">
              Our Story
            </h2>
            <p className="text-charcoal/80 dark:text-gray-300 text-base font-normal leading-relaxed pb-6 pt-1 px-4">
              Founded in 2020 with a passion for precision and a commitment to
              craft, {mockData.business.name} is more than just a barber
              shop—it's a community hub where style meets tradition. Our mission
              is to provide an unparalleled grooming experience, combining
              top-tier skills with a welcoming atmosphere. We believe that a
              great haircut can change your day, and we're here to make every
              day a great one.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              <div
                className="w-full bg-center bg-no-repeat aspect-[4/3] bg-cover rounded-lg"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDT3TkNCs-K8C1Iz2_9rTmW-lGeShA9PK1-K5waADASo4neY35-jRodVfCy3XTdq6cJHXtCq6Z4375saaMcgvPV41DABIlIQP-Q8QVpYYjB64T5LwMM97V-ocx4Mpgk9dpzuz8guvjEcIAUhok_cTI4uVZAXj3NPUsNjMQSIIx2uyj7mONMVdyXMYVS95N0x7X1fSRKZ80gf1AcQqmVWoHCl-kCBSoQuEcRHU4VMyFyRcA99_3kTEVBZYuFty9fDFyKEK3uI4iYiEQ')`,
                }}
              ></div>
              <div
                className="w-full bg-center bg-no-repeat aspect-[4/3] bg-cover rounded-lg"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBCKDSALJdF6udXIuazKoTwjoMyn8UmYTBrkFLCZKuW-FZrLWEnSpeh0NBikKtGXm8J4YlO-8S2_iWCzilUZPUft2SS5VxeCv3bfDx6NsnODiMXdJT6ZpP07-6e328nn2Fuf1K02Fxqnl1LmzMAuA_3gDiGWtgYNk2-htr5SkRCeQzQJ5cWGBkbiRxP07jmywlT8skeZL4pcqpRzanHdyEQwVYo8wRl7cnEdDi9sbbwFaktDnN-rs-gCl-duFRcvl5-oj-OTMFaREk')`,
                }}
              ></div>
              <div
                className="w-full bg-center bg-no-repeat aspect-[4/3] bg-cover rounded-lg sm:col-span-2 lg:col-span-1"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAwSH31eqITNhDYaC8q4i2Y2yDA4r6EuxQZK0LG-eC5QdUDcJPpSbXXfsQquVsFpZAymPkLYAxXmwRNm-Gv2q5guA_5KpIZv481CMtT900j8dOhMvAuQk-9vIZOg13nHjxYzjC3uXAskwVHoMNfOvgxSahezQwHxOQ8PbuLGEc_R80YgU_hAXHVkqIt72k-etmwyeQP5MnKdsiKK9cHRST_odViC7_0LPRh5n2GRrBIXO-VGGulJRW7vnFQJ_jtYuoIb-e1Mv-1k88')`,
                }}
              ></div>
            </div>
          </section>
          {/* Meet the Team Section */}
          <section>
            <h2 className="text-charcoal dark:text-gray-100 text-3xl font-bold leading-tight tracking-[-0.015em] px-4 pb-6">
              Meet Our Talented Team
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockData.team.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-gray-800/20"
                >
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div
                      className="w-32 h-32 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url('${member.image}')` }}
                    ></div>
                    <div>
                      <h3 className="text-xl font-bold text-charcoal dark:text-white">
                        {member.name}
                      </h3>
                      <p className="text-sm text-accent font-semibold">
                        {member.title}
                      </p>
                    </div>
                  </div>
                  <Button size="md" variant="primary" className="mt-auto">
                    Book with {member.name.split(" ")[0]}
                  </Button>
                </div>
              ))}
            </div>
          </section>
          {/* Where to Find Us Section */}
          <section>
            <h2 className="text-charcoal dark:text-gray-100 text-3xl font-bold leading-tight tracking-[-0.015em] px-4 pb-6">
              Where to Find Us
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="w-full aspect-square lg:aspect-auto lg:h-full rounded-xl overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.298991206121!2d-73.98823548459398!3d40.75544797932715!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25855c656515b%3A0x35b1d43a1894add1!2sTimes%20Square!5e0!3m2!1sen!2sus!4v1676391442123!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <div className="flex flex-col gap-6">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-accent text-3xl mt-1">
                    location_on
                  </span>
                  <div>
                    <h4 className="font-bold text-lg text-charcoal dark:text-white">
                      Address
                    </h4>
                    <p className="text-charcoal/80 dark:text-gray-300">
                      {mockData.business.address}
                    </p>
                    <p className="text-sm text-charcoal/60 dark:text-gray-400 mt-1">
                      Located in the heart of downtown, right next to the City
                      Art Gallery.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-accent text-3xl mt-1">
                    local_parking
                  </span>
                  <div>
                    <h4 className="font-bold text-lg text-charcoal dark:text-white">
                      Parking
                    </h4>
                    <p className="text-charcoal/80 dark:text-gray-300">
                      Street parking is available. The Market St. public garage
                      is a 2-minute walk away and offers affordable rates.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-accent text-3xl mt-1">
                    directions_bus
                  </span>
                  <div>
                    <h4 className="font-bold text-lg text-charcoal dark:text-white">
                      Public Transport
                    </h4>
                    <p className="text-charcoal/80 dark:text-gray-300">
                      We are easily accessible via the A/C/E subway lines at the
                      Grand Station stop, or by the M15 bus route.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
