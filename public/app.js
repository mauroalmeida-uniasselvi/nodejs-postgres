const { useEffect, useState } = React;

function App() {
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    grade: "",
    email: "",
  });
  const [updateId, setUpdateId] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [status, setStatus] = useState("");

  async function fetchStudents() {
    const response = await fetch("/api/students");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao listar alunos");
    }
    setStudents(data);
  }

  useEffect(() => {
    fetchStudents().catch((error) => setStatus(error.message));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function createStudent(event) {
    event.preventDefault();
    setStatus("");

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      grade: form.grade,
      email: form.email,
    };

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Erro ao criar aluno");
      }

      setStatus(`Aluno criado: ID ${data.id}`);
      setForm({ first_name: "", last_name: "", grade: "", email: "" });
      await fetchStudents();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function updateStudent(event) {
    event.preventDefault();
    setStatus("");

    const id = Number(updateId);
    if (!id) {
      setStatus("Informe um ID válido para atualizar.");
      return;
    }

    const payload = {};
    if (form.first_name.trim()) payload.first_name = form.first_name.trim();
    if (form.last_name.trim()) payload.last_name = form.last_name.trim();
    if (form.grade.trim()) payload.grade = form.grade.trim();
    if (form.email.trim()) payload.email = form.email.trim();

    if (Object.keys(payload).length === 0) {
      setStatus("Preencha ao menos um campo para atualizar.");
      return;
    }

    try {
      const response = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Erro ao atualizar aluno");
      }

      setStatus(`Aluno atualizado: ID ${data.id}`);
      await fetchStudents();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function removeStudent(event) {
    event.preventDefault();
    setStatus("");

    const id = Number(deleteId);
    if (!id) {
      setStatus("Informe um ID válido para remover.");
      return;
    }

    try {
      const response = await fetch(`/api/students/${id}`, { method: "DELETE" });
      if (!response.ok) {
        let errorMessage = "Erro ao remover aluno";
        try {
          const data = await response.json();
          errorMessage = data?.error || errorMessage;
        } catch (_error) {
        }
        throw new Error(errorMessage);
      }

      setStatus(`Aluno removido: ID ${id}`);
      setDeleteId("");
      await fetchStudents();
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">CRUD de Students</h1>

      <form onSubmit={createStudent} className="bg-white shadow rounded-xl p-4 grid gap-3 md:grid-cols-2">
        <input name="first_name" value={form.first_name} onChange={updateField} placeholder="First name" className="border rounded px-3 py-2" />
        <input name="last_name" value={form.last_name} onChange={updateField} placeholder="Last name" className="border rounded px-3 py-2" />
        <input name="grade" type="text" value={form.grade} onChange={updateField} placeholder="Grade" className="border rounded px-3 py-2" />
        <input name="email" type="email" value={form.email} onChange={updateField} placeholder="Email" className="border rounded px-3 py-2" />
        <button type="submit" className="md:col-span-2 bg-blue-600 text-white rounded px-4 py-2">POST /api/students</button>
      </form>

      <form onSubmit={updateStudent} className="bg-white shadow rounded-xl p-4 grid gap-3 md:grid-cols-2">
        <input value={updateId} onChange={(event) => setUpdateId(event.target.value)} placeholder="ID para atualizar" className="border rounded px-3 py-2" />
        <div className="text-sm text-slate-600 self-center">PUT parcial com os campos do formulário acima</div>
        <button type="submit" className="md:col-span-2 bg-amber-600 text-white rounded px-4 py-2">PUT /api/students/:id</button>
      </form>

      <form onSubmit={removeStudent} className="bg-white shadow rounded-xl p-4 grid gap-3 md:grid-cols-2">
        <input value={deleteId} onChange={(event) => setDeleteId(event.target.value)} placeholder="ID para remover" className="border rounded px-3 py-2" />
        <button type="submit" className="bg-red-600 text-white rounded px-4 py-2">DELETE /api/students/:id</button>
      </form>

      <button onClick={() => fetchStudents().catch((error) => setStatus(error.message))} className="bg-slate-800 text-white rounded px-4 py-2">GET /api/students</button>

      {status && <div className="bg-slate-900 text-white rounded p-3">{status}</div>}

      <div className="bg-white shadow rounded-xl p-4 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b">
              <th className="py-2">ID</th>
              <th className="py-2">First Name</th>
              <th className="py-2">Last Name</th>
              <th className="py-2">Grade</th>
              <th className="py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="border-b">
                <td className="py-2">{student.id}</td>
                <td className="py-2">{student.first_name}</td>
                <td className="py-2">{student.last_name}</td>
                <td className="py-2">{student.grade}</td>
                <td className="py-2">{student.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
