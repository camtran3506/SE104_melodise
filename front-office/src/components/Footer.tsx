import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, Mail, Music2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-24 bg-[rgba(10,15,28,0.85)] backdrop-blur-md border-t border-white/10">
      <div className="container mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div className="md:col-span-2">
          <h3 className="font-display text-2xl text-gold font-bold">melodise</h3>
          <p className="text-mist/80 text-sm mt-4 leading-relaxed max-w-md">
            Nền tảng phân phối nhạc bản quyền B2B cao cấp — nơi mỗi giai điệu là một bức họa. Chúng tôi kết nối nhạc sĩ với thương hiệu, agency và creator thông qua hệ thống cấp phép minh bạch và chất lượng phòng thu.
          </p>
          <div className="flex gap-3 mt-5">
            {[Facebook, Instagram, Youtube, Music2].map((I, i) => (
              <a key={i} href="#" className="h-9 w-9 grid place-items-center rounded-full border border-gold/40 text-gold hover:bg-gold/10 transition"><I className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        <FooterCol
          title="Hỗ trợ & Liên hệ"
          items={[
            ["FAQ", "/faq"],
            ["Liên hệ", "/"],
            ["Điều khoản sử dụng", "/"],
            ["Chính sách bản quyền", "/"],
          ]}
        />
      </div>
      <div className="border-t border-gold/20">
        <p className="text-center text-mist/60 text-xs py-5 tracking-wide">melodise's Premium B2B Music — Copyright © 2026</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="font-display text-canvas text-lg mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {items.map(([label, href]) => (
          <li key={label}><Link to={href} className="text-mist/80 text-sm hover:text-gold transition">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
