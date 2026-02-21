/**
 * Static country data: ISO 3166 code, name, flag emoji, and dial code.
 * Used by the PhoneInput component for country selection.
 */

export interface Country {
    code: string;     // ISO 3166-1 alpha-2
    name: string;
    flag: string;     // emoji flag
    dialCode: string; // e.g. "+1"
}

export const countries: Country[] = [
    { code: "AF", name: "Afghanistan", flag: "🇦🇫", dialCode: "+93" },
    { code: "AL", name: "Albania", flag: "🇦🇱", dialCode: "+355" },
    { code: "DZ", name: "Algeria", flag: "🇩🇿", dialCode: "+213" },
    { code: "AD", name: "Andorra", flag: "🇦🇩", dialCode: "+376" },
    { code: "AO", name: "Angola", flag: "🇦🇴", dialCode: "+244" },
    { code: "AR", name: "Argentina", flag: "🇦🇷", dialCode: "+54" },
    { code: "AM", name: "Armenia", flag: "🇦🇲", dialCode: "+374" },
    { code: "AU", name: "Australia", flag: "🇦🇺", dialCode: "+61" },
    { code: "AT", name: "Austria", flag: "🇦🇹", dialCode: "+43" },
    { code: "AZ", name: "Azerbaijan", flag: "🇦🇿", dialCode: "+994" },
    { code: "BH", name: "Bahrain", flag: "🇧🇭", dialCode: "+973" },
    { code: "BD", name: "Bangladesh", flag: "🇧🇩", dialCode: "+880" },
    { code: "BY", name: "Belarus", flag: "🇧🇾", dialCode: "+375" },
    { code: "BE", name: "Belgium", flag: "🇧🇪", dialCode: "+32" },
    { code: "BZ", name: "Belize", flag: "🇧🇿", dialCode: "+501" },
    { code: "BJ", name: "Benin", flag: "🇧🇯", dialCode: "+229" },
    { code: "BT", name: "Bhutan", flag: "🇧🇹", dialCode: "+975" },
    { code: "BO", name: "Bolivia", flag: "🇧🇴", dialCode: "+591" },
    { code: "BA", name: "Bosnia and Herzegovina", flag: "🇧🇦", dialCode: "+387" },
    { code: "BW", name: "Botswana", flag: "🇧🇼", dialCode: "+267" },
    { code: "BR", name: "Brazil", flag: "🇧🇷", dialCode: "+55" },
    { code: "BN", name: "Brunei", flag: "🇧🇳", dialCode: "+673" },
    { code: "BG", name: "Bulgaria", flag: "🇧🇬", dialCode: "+359" },
    { code: "BF", name: "Burkina Faso", flag: "🇧🇫", dialCode: "+226" },
    { code: "BI", name: "Burundi", flag: "🇧🇮", dialCode: "+257" },
    { code: "KH", name: "Cambodia", flag: "🇰🇭", dialCode: "+855" },
    { code: "CM", name: "Cameroon", flag: "🇨🇲", dialCode: "+237" },
    { code: "CA", name: "Canada", flag: "🇨🇦", dialCode: "+1" },
    { code: "CV", name: "Cape Verde", flag: "🇨🇻", dialCode: "+238" },
    { code: "CF", name: "Central African Republic", flag: "🇨🇫", dialCode: "+236" },
    { code: "TD", name: "Chad", flag: "🇹🇩", dialCode: "+235" },
    { code: "CL", name: "Chile", flag: "🇨🇱", dialCode: "+56" },
    { code: "CN", name: "China", flag: "🇨🇳", dialCode: "+86" },
    { code: "CO", name: "Colombia", flag: "🇨🇴", dialCode: "+57" },
    { code: "KM", name: "Comoros", flag: "🇰🇲", dialCode: "+269" },
    { code: "CG", name: "Congo", flag: "🇨🇬", dialCode: "+242" },
    { code: "CD", name: "Congo (DRC)", flag: "🇨🇩", dialCode: "+243" },
    { code: "CR", name: "Costa Rica", flag: "🇨🇷", dialCode: "+506" },
    { code: "HR", name: "Croatia", flag: "🇭🇷", dialCode: "+385" },
    { code: "CU", name: "Cuba", flag: "🇨🇺", dialCode: "+53" },
    { code: "CY", name: "Cyprus", flag: "🇨🇾", dialCode: "+357" },
    { code: "CZ", name: "Czech Republic", flag: "🇨🇿", dialCode: "+420" },
    { code: "DK", name: "Denmark", flag: "🇩🇰", dialCode: "+45" },
    { code: "DJ", name: "Djibouti", flag: "🇩🇯", dialCode: "+253" },
    { code: "DO", name: "Dominican Republic", flag: "🇩🇴", dialCode: "+1" },
    { code: "EC", name: "Ecuador", flag: "🇪🇨", dialCode: "+593" },
    { code: "EG", name: "Egypt", flag: "🇪🇬", dialCode: "+20" },
    { code: "SV", name: "El Salvador", flag: "🇸🇻", dialCode: "+503" },
    { code: "GQ", name: "Equatorial Guinea", flag: "🇬🇶", dialCode: "+240" },
    { code: "ER", name: "Eritrea", flag: "🇪🇷", dialCode: "+291" },
    { code: "EE", name: "Estonia", flag: "🇪🇪", dialCode: "+372" },
    { code: "SZ", name: "Eswatini", flag: "🇸🇿", dialCode: "+268" },
    { code: "ET", name: "Ethiopia", flag: "🇪🇹", dialCode: "+251" },
    { code: "FJ", name: "Fiji", flag: "🇫🇯", dialCode: "+679" },
    { code: "FI", name: "Finland", flag: "🇫🇮", dialCode: "+358" },
    { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33" },
    { code: "GA", name: "Gabon", flag: "🇬🇦", dialCode: "+241" },
    { code: "GM", name: "Gambia", flag: "🇬🇲", dialCode: "+220" },
    { code: "GE", name: "Georgia", flag: "🇬🇪", dialCode: "+995" },
    { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49" },
    { code: "GH", name: "Ghana", flag: "🇬🇭", dialCode: "+233" },
    { code: "GR", name: "Greece", flag: "🇬🇷", dialCode: "+30" },
    { code: "GT", name: "Guatemala", flag: "🇬🇹", dialCode: "+502" },
    { code: "GN", name: "Guinea", flag: "🇬🇳", dialCode: "+224" },
    { code: "GW", name: "Guinea-Bissau", flag: "🇬🇼", dialCode: "+245" },
    { code: "GY", name: "Guyana", flag: "🇬🇾", dialCode: "+592" },
    { code: "HT", name: "Haiti", flag: "🇭🇹", dialCode: "+509" },
    { code: "HN", name: "Honduras", flag: "🇭🇳", dialCode: "+504" },
    { code: "HK", name: "Hong Kong", flag: "🇭🇰", dialCode: "+852" },
    { code: "HU", name: "Hungary", flag: "🇭🇺", dialCode: "+36" },
    { code: "IS", name: "Iceland", flag: "🇮🇸", dialCode: "+354" },
    { code: "IN", name: "India", flag: "🇮🇳", dialCode: "+91" },
    { code: "ID", name: "Indonesia", flag: "🇮🇩", dialCode: "+62" },
    { code: "IR", name: "Iran", flag: "🇮🇷", dialCode: "+98" },
    { code: "IQ", name: "Iraq", flag: "🇮🇶", dialCode: "+964" },
    { code: "IE", name: "Ireland", flag: "🇮🇪", dialCode: "+353" },
    { code: "IL", name: "Israel", flag: "🇮🇱", dialCode: "+972" },
    { code: "IT", name: "Italy", flag: "🇮🇹", dialCode: "+39" },
    { code: "CI", name: "Ivory Coast", flag: "🇨🇮", dialCode: "+225" },
    { code: "JM", name: "Jamaica", flag: "🇯🇲", dialCode: "+1" },
    { code: "JP", name: "Japan", flag: "🇯🇵", dialCode: "+81" },
    { code: "JO", name: "Jordan", flag: "🇯🇴", dialCode: "+962" },
    { code: "KZ", name: "Kazakhstan", flag: "🇰🇿", dialCode: "+7" },
    { code: "KE", name: "Kenya", flag: "🇰🇪", dialCode: "+254" },
    { code: "KW", name: "Kuwait", flag: "🇰🇼", dialCode: "+965" },
    { code: "KG", name: "Kyrgyzstan", flag: "🇰🇬", dialCode: "+996" },
    { code: "LA", name: "Laos", flag: "🇱🇦", dialCode: "+856" },
    { code: "LV", name: "Latvia", flag: "🇱🇻", dialCode: "+371" },
    { code: "LB", name: "Lebanon", flag: "🇱🇧", dialCode: "+961" },
    { code: "LS", name: "Lesotho", flag: "🇱🇸", dialCode: "+266" },
    { code: "LR", name: "Liberia", flag: "🇱🇷", dialCode: "+231" },
    { code: "LY", name: "Libya", flag: "🇱🇾", dialCode: "+218" },
    { code: "LI", name: "Liechtenstein", flag: "🇱🇮", dialCode: "+423" },
    { code: "LT", name: "Lithuania", flag: "🇱🇹", dialCode: "+370" },
    { code: "LU", name: "Luxembourg", flag: "🇱🇺", dialCode: "+352" },
    { code: "MO", name: "Macau", flag: "🇲🇴", dialCode: "+853" },
    { code: "MG", name: "Madagascar", flag: "🇲🇬", dialCode: "+261" },
    { code: "MW", name: "Malawi", flag: "🇲🇼", dialCode: "+265" },
    { code: "MY", name: "Malaysia", flag: "🇲🇾", dialCode: "+60" },
    { code: "MV", name: "Maldives", flag: "🇲🇻", dialCode: "+960" },
    { code: "ML", name: "Mali", flag: "🇲🇱", dialCode: "+223" },
    { code: "MT", name: "Malta", flag: "🇲🇹", dialCode: "+356" },
    { code: "MR", name: "Mauritania", flag: "🇲🇷", dialCode: "+222" },
    { code: "MU", name: "Mauritius", flag: "🇲🇺", dialCode: "+230" },
    { code: "MX", name: "Mexico", flag: "🇲🇽", dialCode: "+52" },
    { code: "MD", name: "Moldova", flag: "🇲🇩", dialCode: "+373" },
    { code: "MC", name: "Monaco", flag: "🇲🇨", dialCode: "+377" },
    { code: "MN", name: "Mongolia", flag: "🇲🇳", dialCode: "+976" },
    { code: "ME", name: "Montenegro", flag: "🇲🇪", dialCode: "+382" },
    { code: "MA", name: "Morocco", flag: "🇲🇦", dialCode: "+212" },
    { code: "MZ", name: "Mozambique", flag: "🇲🇿", dialCode: "+258" },
    { code: "MM", name: "Myanmar", flag: "🇲🇲", dialCode: "+95" },
    { code: "NA", name: "Namibia", flag: "🇳🇦", dialCode: "+264" },
    { code: "NP", name: "Nepal", flag: "🇳🇵", dialCode: "+977" },
    { code: "NL", name: "Netherlands", flag: "🇳🇱", dialCode: "+31" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿", dialCode: "+64" },
    { code: "NI", name: "Nicaragua", flag: "🇳🇮", dialCode: "+505" },
    { code: "NE", name: "Niger", flag: "🇳🇪", dialCode: "+227" },
    { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234" },
    { code: "KP", name: "North Korea", flag: "🇰🇵", dialCode: "+850" },
    { code: "MK", name: "North Macedonia", flag: "🇲🇰", dialCode: "+389" },
    { code: "NO", name: "Norway", flag: "🇳🇴", dialCode: "+47" },
    { code: "OM", name: "Oman", flag: "🇴🇲", dialCode: "+968" },
    { code: "PK", name: "Pakistan", flag: "🇵🇰", dialCode: "+92" },
    { code: "PS", name: "Palestine", flag: "🇵🇸", dialCode: "+970" },
    { code: "PA", name: "Panama", flag: "🇵🇦", dialCode: "+507" },
    { code: "PG", name: "Papua New Guinea", flag: "🇵🇬", dialCode: "+675" },
    { code: "PY", name: "Paraguay", flag: "🇵🇾", dialCode: "+595" },
    { code: "PE", name: "Peru", flag: "🇵🇪", dialCode: "+51" },
    { code: "PH", name: "Philippines", flag: "🇵🇭", dialCode: "+63" },
    { code: "PL", name: "Poland", flag: "🇵🇱", dialCode: "+48" },
    { code: "PT", name: "Portugal", flag: "🇵🇹", dialCode: "+351" },
    { code: "PR", name: "Puerto Rico", flag: "🇵🇷", dialCode: "+1" },
    { code: "QA", name: "Qatar", flag: "🇶🇦", dialCode: "+974" },
    { code: "RO", name: "Romania", flag: "🇷🇴", dialCode: "+40" },
    { code: "RU", name: "Russia", flag: "🇷🇺", dialCode: "+7" },
    { code: "RW", name: "Rwanda", flag: "🇷🇼", dialCode: "+250" },
    { code: "SA", name: "Saudi Arabia", flag: "🇸🇦", dialCode: "+966" },
    { code: "SN", name: "Senegal", flag: "🇸🇳", dialCode: "+221" },
    { code: "RS", name: "Serbia", flag: "🇷🇸", dialCode: "+381" },
    { code: "SL", name: "Sierra Leone", flag: "🇸🇱", dialCode: "+232" },
    { code: "SG", name: "Singapore", flag: "🇸🇬", dialCode: "+65" },
    { code: "SK", name: "Slovakia", flag: "🇸🇰", dialCode: "+421" },
    { code: "SI", name: "Slovenia", flag: "🇸🇮", dialCode: "+386" },
    { code: "SO", name: "Somalia", flag: "🇸🇴", dialCode: "+252" },
    { code: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27" },
    { code: "KR", name: "South Korea", flag: "🇰🇷", dialCode: "+82" },
    { code: "SS", name: "South Sudan", flag: "🇸🇸", dialCode: "+211" },
    { code: "ES", name: "Spain", flag: "🇪🇸", dialCode: "+34" },
    { code: "LK", name: "Sri Lanka", flag: "🇱🇰", dialCode: "+94" },
    { code: "SD", name: "Sudan", flag: "🇸🇩", dialCode: "+249" },
    { code: "SR", name: "Suriname", flag: "🇸🇷", dialCode: "+597" },
    { code: "SE", name: "Sweden", flag: "🇸🇪", dialCode: "+46" },
    { code: "CH", name: "Switzerland", flag: "🇨🇭", dialCode: "+41" },
    { code: "SY", name: "Syria", flag: "🇸🇾", dialCode: "+963" },
    { code: "TW", name: "Taiwan", flag: "🇹🇼", dialCode: "+886" },
    { code: "TJ", name: "Tajikistan", flag: "🇹🇯", dialCode: "+992" },
    { code: "TZ", name: "Tanzania", flag: "🇹🇿", dialCode: "+255" },
    { code: "TH", name: "Thailand", flag: "🇹🇭", dialCode: "+66" },
    { code: "TL", name: "Timor-Leste", flag: "🇹🇱", dialCode: "+670" },
    { code: "TG", name: "Togo", flag: "🇹🇬", dialCode: "+228" },
    { code: "TT", name: "Trinidad and Tobago", flag: "🇹🇹", dialCode: "+1" },
    { code: "TN", name: "Tunisia", flag: "🇹🇳", dialCode: "+216" },
    { code: "TR", name: "Turkey", flag: "🇹🇷", dialCode: "+90" },
    { code: "TM", name: "Turkmenistan", flag: "🇹🇲", dialCode: "+993" },
    { code: "UG", name: "Uganda", flag: "🇺🇬", dialCode: "+256" },
    { code: "UA", name: "Ukraine", flag: "🇺🇦", dialCode: "+380" },
    { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", dialCode: "+971" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44" },
    { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1" },
    { code: "UY", name: "Uruguay", flag: "🇺🇾", dialCode: "+598" },
    { code: "UZ", name: "Uzbekistan", flag: "🇺🇿", dialCode: "+998" },
    { code: "VE", name: "Venezuela", flag: "🇻🇪", dialCode: "+58" },
    { code: "VN", name: "Vietnam", flag: "🇻🇳", dialCode: "+84" },
    { code: "YE", name: "Yemen", flag: "🇾🇪", dialCode: "+967" },
    { code: "ZM", name: "Zambia", flag: "🇿🇲", dialCode: "+260" },
    { code: "ZW", name: "Zimbabwe", flag: "🇿🇼", dialCode: "+263" },
];

/**
 * Detect the user's likely country from browser locale.
 * Falls back to Lebanon (LB) as the platform's primary market.
 */
export function detectDefaultCountry(): Country {
    if (typeof navigator === "undefined") {
        return countries.find((c) => c.code === "US")!;
    }

    // navigator.language is like "en-US", "ar-LB", "fr-FR"
    const locale = navigator.language || "";
    const parts = locale.split("-");
    const regionCode = parts.length > 1 ? parts[1].toUpperCase() : "";

    if (regionCode) {
        const match = countries.find((c) => c.code === regionCode);
        if (match) return match;
    }

    // Fallback to Lebanon
    return countries.find((c) => c.code === "US")!;
}

/**
 * Search countries by name or dial code. Fuzzy partial match.
 */
export function searchCountries(query: string): Country[] {
    if (!query.trim()) return countries;

    const q = query.trim().toLowerCase();

    // If searching by dial code (starts with + or is all digits)
    const isDialSearch = q.startsWith("+") || /^\d+$/.test(q);

    if (isDialSearch) {
        const digits = q.replace(/[^0-9]/g, "");
        return countries.filter((c) => c.dialCode.replace("+", "").startsWith(digits));
    }

    // Search by country name
    return countries.filter((c) => c.name.toLowerCase().includes(q));
}
