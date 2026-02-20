import { NextResponse } from "next/server";
import { naiveBayesPredict } from "@/lib/naiveBayes";
import pool, { initDB } from "@/lib/db";

export async function POST(req) {
    try {
        await initDB(); // Ensure DB and table exist

        const { nilai } = await req.json();

        if (!nilai) {
            return NextResponse.json(
                { error: "Input tidak lengkap" },
                { status: 400 }
            );
        }

        // Load training data from MySQL
        const [dataLatih] = await pool.query("SELECT * FROM training_data");

        const hasil = naiveBayesPredict(
            Number(nilai),
            dataLatih
        );

        return NextResponse.json({ hasil });
    } catch (error) {
        console.error('Error in prediction API (MySQL):', error);
        return NextResponse.json(
            { error: "Gagal melakukan prediksi" },
            { status: 500 }
        );
    }
}
