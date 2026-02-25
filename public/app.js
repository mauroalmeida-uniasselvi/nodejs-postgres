const { useEffect, useState } = React;

const emoticons = {
  book: (className = "w-5 h-5") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v15.5A2.5 2.5 0 0 0 17.5 17H6.5A2.5 2.5 0 0 0 4 19.5V6.5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 11h8" />
    </svg>
  ),
  plus: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
  ),
  refresh: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8 8 0 1 0 2.2 5.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 4v7h-7" />
    </svg>
  ),
  badge: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 5h10v14l-5-3-5 3V5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 9h5" />
    </svg>
  ),
  user: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 19a7 7 0 0 1 14 0" />
    </svg>
  ),
  school: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10 12 5l9 5-9 5-9-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12.5V16c0 .8 2.2 2 5 2s5-1.2 5-2v-3.5" />
    </svg>
  ),
  email: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m4 8 8 6 8-6" />
    </svg>
  ),
  settings: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <circle cx="12" cy="12" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h0A1.7 1.7 0 0 0 10.2 3V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.6h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1Z" />
    </svg>
  ),
  edit: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4 10.5-10.5Z" />
    </svg>
  ),
  trash: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V5h6v2" />
    </svg>
  ),
  save: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h11l3 3v13H5V4Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v6h8V4M8 20v-6h8v6" />
    </svg>
  ),
  userPlus: (className = "w-4 h-4") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19a6 6 0 0 0-12 0" />
      <circle cx="9" cy="8" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 8v6M16 11h6" />
    </svg>
  ),
  inbox: (className = "w-5 h-5") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13 6 6h12l3 7v5H3v-5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h5l2 3h4l2-3h5" />
    </svg>
  ),
  close: (className = "w-5 h-5") => (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
    </svg>
  ),
};

function App() {
  const [students, setStudents] = useState([]);
  const emptyForm = {
    id: "",
    name: "",
    grade: "",
    email: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [queueMessage, setQueueMessage] = useState("");

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

  useEffect(() => {
    const eventSource = new EventSource("/api/students/events");

    eventSource.addEventListener("student-updated", () => {
      fetchStudents().catch((error) => console.error(error));
    });

    eventSource.onerror = () => {
      console.error("Conexão SSE interrompida");
    };

    return () => {
      eventSource.close();
    };
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
      id: student.id || "",
      name: student.name || "",
      grade: student.grade || "",
      email: student.email || "",
    });
    setIsModalOpen(true);
  }

  function openDeleteModal(student) {
    if (!student?.id) {
      return;
    }
    setDeleteTarget({
      id: student.id,
      name: student.name || "",
    });
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
  }

  async function createStudent(event) {
    event.preventDefault();

    const payload = {
      id: form.id,
      name: form.name,
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

      setQueueMessage(`Solicitação enviada. Operação ${data?.operationId || "-"}.`);
      closeModal();
    } catch (error) {
      console.error(error);
    }
  }

  async function updateStudent(event, id) {
    event.preventDefault();

    const payload = {};
    payload.name = form.name.trim();
    payload.grade = form.grade.trim();
    payload.email = form.email.trim();

    if (!payload.name || !payload.grade || !payload.email) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Erro ao atualizar aluno");
      }

      setQueueMessage(`Solicitação enviada. Operação ${data?.operationId || "-"}.`);
      closeModal();
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
      await updateStudent(event, String(editingId));
      return;
    }

    await createStudent(event);
  }

  async function removeStudent(id) {
    if (!id) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        let errorMessage = "Erro ao remover aluno";
        try {
          const data = await response.json();
          errorMessage = data?.error || errorMessage;
        } catch (_error) {
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setQueueMessage(`Solicitação enviada. Operação ${data?.operationId || "-"}.`);
    } catch (error) {
      console.error(error);
    }
  }

  async function confirmDeleteStudent() {
    if (!deleteTarget?.id) {
      return;
    }

    await removeStudent(deleteTarget.id);
    closeDeleteModal();
  }

  return (
    <div id="students-app" className="space-y-6 py-8">
      <div id="students-header" className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            {emoticons.book()}
            <span>Cadastro de Estudantes</span>
          </h1>
          <p className="text-slate-600 mt-1">Crie, edite e remova registros de estudantes.</p>
        </div>
        <button
          id="btn-open-create-student-modal"
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          <span className="inline-flex items-center gap-2">
            {emoticons.plus()}
            <span>Novo</span>
          </span>
        </button>
      </div>

      <div className="flex justify-end">
        <button
          id="btn-refresh-students"
          onClick={() => fetchStudents().catch((error) => console.error(error))}
          className="bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-lg px-4 py-2.5 transition"
        >
          <span className="inline-flex items-center gap-2">
            {emoticons.refresh()}
            <span>Atualizar</span>
          </span>
        </button>
      </div>

      {queueMessage && (
        <div id="students-queue-message" className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3 text-sm">
          {queueMessage}
        </div>
      )}

      <div id="students-table-container" className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table id="students-table" className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="py-3 px-4 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {emoticons.badge()}
                    <span>Matrícula</span>
                  </span>
                </th>
                <th className="py-3 px-4 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {emoticons.user()}
                    <span>Nome</span>
                  </span>
                </th>
                <th className="py-3 px-4 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {emoticons.school()}
                    <span>Turma</span>
                  </span>
                </th>
                <th className="py-3 px-4 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {emoticons.email()}
                    <span>Email</span>
                  </span>
                </th>
                <th className="py-3 px-4 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    {emoticons.settings()}
                    <span>Ações</span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody id="students-table-body" className="divide-y divide-slate-200 text-slate-800">
              {students.map((student) => (
                <tr id={`student-row-${student.id}`} key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td id={`student-id-${student.id}`} className="py-3 px-4">{student.id}</td>
                  <td id={`student-name-${student.id}`} className="py-3 px-4">{student.name}</td>
                  <td id={`student-grade-${student.id}`} className="py-3 px-4">{student.grade}</td>
                  <td id={`student-email-${student.id}`} className="py-3 px-4">{student.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-edit-student-${student.id}`}
                        onClick={() => openEditModal(student)}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {emoticons.edit()}
                          <span>Editar</span>
                        </span>
                      </button>
                      <button
                        id={`btn-delete-student-${student.id}`}
                        onClick={() => openDeleteModal(student)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {emoticons.trash()}
                          <span>Excluir</span>
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <div id="students-empty-state" className="px-4 py-8 text-center text-slate-500 flex items-center justify-center gap-2">
            {emoticons.inbox()}
            <span>Nenhum estudante cadastrado.</span>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div id="student-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="student-modal" className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="student-modal-title" className="text-xl font-semibold text-slate-900">
                {modalMode === "create" ? "Cadastrar estudante" : `Editar estudante #${editingId}`}
              </h2>
              <button
                id="btn-close-student-modal"
                type="button"
                onClick={closeModal}
                className="text-slate-500 hover:text-slate-800 font-medium"
                aria-label="Fechar"
              >
                {emoticons.close()}
              </button>
            </div>

            <form id="student-form" onSubmit={submitModal} className="grid gap-4 md:grid-cols-2">
              <label htmlFor="input-student-id" className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Matrícula</span>
                <input
                  id="input-student-id"
                  name="id"
                  value={form.id}
                  onChange={updateField}
                  placeholder="digite a matrícula"
                  disabled={modalMode === "edit"}
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <label htmlFor="input-student-name" className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Nome</span>
                <input
                  id="input-student-name"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="digite o nome"
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <label htmlFor="input-student-grade" className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Turma</span>
                <input
                  id="input-student-grade"
                  name="grade"
                  type="text"
                  value={form.grade}
                  onChange={updateField}
                  placeholder="digite a turma"
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <label htmlFor="input-student-email" className="space-y-1 block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  id="input-student-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="digite o e-mail"
                  className="w-full border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-lg px-3 py-2 outline-none"
                />
              </label>
              <button
                id="btn-submit-student-form"
                type="submit"
                className={`md:col-span-2 text-white font-medium rounded-lg px-4 py-2.5 transition ${modalMode === "create" ? "bg-blue-600 hover:bg-blue-700" : "bg-amber-500 hover:bg-amber-600"}`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {modalMode === "create" ? emoticons.userPlus() : emoticons.save()}
                  <span>{modalMode === "create" ? "Cadastrar" : "Salvar"}</span>
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div id="delete-student-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div id="delete-student-modal" className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-md space-y-4">
            <div className="space-y-1">
              <h2 id="delete-student-modal-title" className="text-xl font-semibold text-slate-900">Confirmar exclusão</h2>
              <p id="delete-student-modal-message" className="text-slate-600 text-sm">
                Deseja realmente excluir {deleteTarget.name ? <strong>{deleteTarget.name}</strong> : "este estudante"}?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                id="btn-cancel-delete-student"
                type="button"
                onClick={closeDeleteModal}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg px-4 py-2 text-sm font-medium transition"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-student"
                type="button"
                onClick={confirmDeleteStudent}
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
