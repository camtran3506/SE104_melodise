import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

export const Route = createFileRoute("/faq")({
  component: FAQPage,
  head: () => ({
    meta: [
      { title: "Câu hỏi thường gặp — melodise" },
      {
        name: "description",
        content:
          "Giải đáp các thắc mắc thường gặp về tài khoản, mua hàng, thanh toán và bản quyền tại melodise.",
      },
      { property: "og:title", content: "Câu hỏi thường gặp — melodise" },
      {
        property: "og:description",
        content:
          "Tất cả những điều bạn cần biết khi sử dụng nền tảng nhạc bản quyền melodise.",
      },
    ],
  }),
});

type QA = { q: string; a: React.ReactNode };
type Section = { title: string; items: QA[] };

const SECTIONS: Section[] = [
  {
    title: "1. Tài khoản & Đăng nhập",
    items: [
      {
        q: "Làm thế nào để đăng ký tài khoản trên melodise?",
        a: (
          <>
            Rất đơn giản! Bạn chỉ cần nhấn vào chữ <b>“Đăng nhập”</b> ở góc phải
            thanh điều hướng, chuyển sang tab <b>“Đăng ký”</b> và điền đầy đủ 4
            thông tin: Họ và tên, Số điện thoại, Email và Mật khẩu. Sau đó nhấn
            nút <b>“Tạo tài khoản”</b> để bắt đầu khám phá kho nhạc.
          </>
        ),
      },
      {
        q: "Tại sao tôi không thấy nút thêm vào giỏ hàng khi nghe nhạc?",
        a: (
          <>
            Để bảo vệ bản quyền và tối ưu hóa trải nghiệm mua sắm B2B, tính năng{" "}
            <b>Giỏ hàng</b> và <b>Thanh toán</b> chỉ hiển thị khi bạn đã đăng
            nhập. Nếu bạn là khách vãng lai, bạn vẫn có thể tự do tìm kiếm và
            nghe thử toàn bộ thư viện nhạc.
          </>
        ),
      },
    ],
  },
  {
    title: "2. Mua hàng & Thanh toán",
    items: [
      {
        q: "melodise hỗ trợ hình thức thanh toán nào?",
        a: (
          <>
            Hiện tại, melodise hỗ trợ hình thức thanh toán <b>chuyển khoản ngân hàng</b>{" "}
            qua mã <b>QR động (Dynamic QR Code)</b>. Tại bước Thanh toán, hệ
            thống sẽ tự động tạo một mã QR chứa sẵn số tiền và nội dung chuyển
            khoản, giúp bạn thao tác nhanh chóng và chính xác tuyệt đối.
          </>
        ),
      },
      {
        q: "Tại sao tôi đã thanh toán thành công nhưng chưa thể tải nhạc về?",
        a: (
          <>
            Để đảm bảo an toàn giao dịch, sau khi bạn nhấn <b>“Xác nhận đã thanh toán”</b>,
            đơn hàng sẽ tạm thời ở trạng thái <b>“Chưa duyệt”</b> để hệ thống
            đối soát. Ngay khi được bộ phận kế toán xác nhận, đơn hàng sẽ chuyển
            sang trạng thái <b>“Đã duyệt”</b>. Lúc này, nút <b>“Tải xuống nhạc”</b>{" "}
            và <b>“Tải xuống giấy phép”</b> sẽ lập tức xuất hiện trong mục{" "}
            <b>Tài nguyên</b> của bạn.
          </>
        ),
      },
    ],
  },
  {
    title: "3. Bản quyền & Kỹ thuật",
    items: [
      {
        q: "Nhạc tải về từ melodise có chất lượng như thế nào?",
        a: (
          <>
            Tất cả các bản nhạc/beat khi được tải xuống (sau khi mua thành công)
            đều là file âm thanh gốc chất lượng cao chuẩn studio (định dạng{" "}
            <b>.wav</b> hoặc <b>.mp3 320kbps</b>), đảm bảo chất lượng âm thanh
            tốt nhất cho các dự án chuyên nghiệp của bạn. Bản nghe thử trực tiếp
            trên web sẽ bị nén chất lượng hoặc chèn watermark âm thanh.
          </>
        ),
      },
    ],
  },
];

function FAQPage() {
  return (
    <div className="container mx-auto max-w-4xl px-6 py-16">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-soft text-gold text-xs tracking-widest uppercase">
          <HelpCircle className="h-3.5 w-3.5" /> Hỗ trợ
        </div>
        <h1 className="font-display text-4xl md:text-5xl text-canvas mt-5">
          Câu hỏi thường gặp
        </h1>
        <p className="text-mist/70 mt-3 max-w-xl mx-auto">
          Mọi điều bạn cần biết về tài khoản, thanh toán và bản quyền tại melodise.
        </p>
      </div>

      <div className="space-y-10">
        {SECTIONS.map((sec) => (
          <section key={sec.title} className="glass rounded-3xl p-8 md:p-10">
            <h2 className="font-display text-2xl text-gold mb-6">{sec.title}</h2>
            <div className="space-y-7">
              {sec.items.map((it) => (
                <div key={it.q}>
                  <h3 className="text-canvas font-semibold text-lg text-center md:text-left">
                    {it.q}
                  </h3>
                  <p className="text-mist/85 text-sm md:text-[15px] leading-relaxed mt-3">
                    {it.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
