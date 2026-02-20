import { NextResponse } from "next/server";
import siswa from "../../../data/siswa.json";
import { naiveBayesPredict } from "../../../lib/naiveBayes";
import pool, { initDB } from "../../../lib/db";

export async function GET() {
    try {
        await initDB();
        const nilaiArr = Object.values(siswa.semester);
        const rataRata =
            nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length;

        const [dataLatih] = await pool.query("SELECT * FROM training_data");

        const hasil = naiveBayesPredict(
            rataRata,
            dataLatih
        );

        return NextResponse.json({
            ...siswa,
            rataRata: rataRata.toFixed(2),
            hasil
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Gagal mengambil data siswa" },
            { status: 500 }
        );
    }
}
