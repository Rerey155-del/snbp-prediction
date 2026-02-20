import { NextResponse } from "next/server";
import pool, { initDB } from "@/lib/db";

export async function POST(req) {
  try {
    await initDB();
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "ID tidak ditemukan" },
        { status: 400 },
      );
    }

    const query = `DELETE FROM students WHERE id = ?`;

    const [result] = await pool.query(query, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Data tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data siswa berhasil dihapus dari database",
    });
  } catch (error) {
    console.error("Error deleting student from MySQL:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data siswa dari database" },
      { status: 500 },
    );
  }
}
