import "./globals.css";

export const metadata = {
    title: "SNBP Predictor - Prediksi Peluang SNBP",
    description: "Sistem prediksi peluang SNBP berbasis algoritma Naive Bayes",
};

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <body>{children}</body>
        </html>
    );
}
