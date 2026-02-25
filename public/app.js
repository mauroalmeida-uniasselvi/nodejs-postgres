const { useEffect, useState } = React;

function App() {
  const [students, setStudents] = useState([]);
  const emptyForm = {
    first_name: "",
    last_name: "",
    grade: "",
    email: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);

  async function fetchStudents() {
    const response = await fetch("/api/students");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Erro ao listar alunos");
    }
    setStudents(data);
  }

  useEffect(() => {
    fetchStudents().catch((error) => console.error(error));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  }

  function openEditModal(student) {
    setModalMode("edit");
    setEditingId(student.id);
    setForm({
      first_name: student.first_name || "",
      last_name: student.last_name || "",
      grade: student.grade || "",
      email: student.email || "",
    });
    setIsModalOpen(true);
  }

  async function createStudent(event) {
    event.preventDefault();

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

      closeModal();
      await fetchStudents();
    } catch (error) {
      console.error(error);
    }
  }

  async function updateStudent(event, id) {
    event.preventDefault();

    const payload = {};
    payload.first_name = form.first_name.trim();
    payload.last_name = form.last_name.trim();
    payload.grade = form.grade.trim();
    payload.email = form.email.trim();

    if (!payload.first_name || !payload.last_name || !payload.grade || !payload.email) {
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

      closeModal();
      await fetchStudents();
    } catch (error) {
      console.error(error);
      return;
    }
  }

  async function submitModal(event) {
    if (modalMode === "edit") {
      if (!editingId) {
        event.preventDefault();
        return;
      }
      await updateStudent(event, Number(editingId));
      return;
    }

    await createStudent(event);
  }

  async function removeStudent(id) {
    if (!id) {
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

      await fetchStudents();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-6 py-8">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Cadastro de Estudantes</h1>
          <p className="text-slate-600 mt-1">Crie, edite e remova registros de estudantes.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          Novo
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => fetchStudents().catch((error) => console.error(error))}
          className="bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          Atualizar lista
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold">ID</th>
                <th className="py-3 px-4 font-semibold">Nome</th>
                <th className="py-3 px-4 font-semibold">Sobrenome</th>
                <th className="py-3 px-4 font-semibold">Turma</th>
                <th className="py-3 px-4 font-semibold">Email</th>
                <th className="py-3 px-4 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">{student.id}</td>
                  <td className="py-3 px-4">{student.first_name}</td>
                  <td className="py-3 px-4">{student.last_name}</td>
                  <td className="py-3 px-4">{student.grade}</td>
                  <td className="py-3 px-4">{student.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(student)}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => removeStudent(student.id)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <div className="px-4 py-8 text-center text-slate-500">Nenhum estudante cadastrado.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {modalMode === "create" ? "Cadastrar estudante" : `Editar estudante #${editingId}`}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-800 font-medium"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={submitModal} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Nome</span>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={updateField}
                  placeholder="Digite o nome"
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Sobrenome</span>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={updateField}
                  placeholder="Digite o sobrenome"
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Turma</span>
                <input
                  name="grade"
                  type="text"
                  value={form.grade}
                  onChange={updateField}
                  placeholder="Digite a turma"
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <label className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="Digite o e-mail"
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <button
                type="submit"
                className={`md:col-span-2 text-white font-medium rounded-lg px-4 py-2.5 transition ${modalMode === "create" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600"}`}
              >
                {modalMode === "create" ? "Cadastrar" : "Salvar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
