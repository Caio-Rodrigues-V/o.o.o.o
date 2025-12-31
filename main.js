import { supabase } from "./supabaseClient";
import "./style.css";

const app = document.querySelector("#app");

function ui() {
  app.innerHTML = `
    <div class="container">
      <h1>To-do</h1>

      <div id="auth">
        <h2>Login</h2>
        <form id="loginForm">
          <input id="email" type="email" placeholder="email" required />
          <input id="password" type="password" placeholder="senha" required />
          <button type="submit">Entrar</button>
        </form>

        <button id="signupBtn" class="secondary">Criar conta</button>
        <p id="authMsg"></p>
      </div>

      <div id="todos" class="hidden">
        <div class="row">
          <span id="userEmail"></span>
          <button id="logoutBtn" class="secondary">Sair</button>
        </div>

        <form id="todoForm">
          <input id="todoTitle" type="text" placeholder="Nova tarefa..." required />
          <button type="submit">Adicionar</button>
        </form>

        <ul id="todoList"></ul>
        <p id="todoMsg"></p>
      </div>
    </div>
  `;
}

async function refreshSessionUI() {
  const { data: { session } } = await supabase.auth.getSession();

  const authBox = document.querySelector("#auth");
  const todosBox = document.querySelector("#todos");
  const userEmail = document.querySelector("#userEmail");

  if (!session) {
    authBox.classList.remove("hidden");
    todosBox.classList.add("hidden");
    return;
  }

  authBox.classList.add("hidden");
  todosBox.classList.remove("hidden");
  userEmail.textContent = session.user.email;

  await loadTodos();
}

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function loadTodos() {
  const msg = document.querySelector("#todoMsg");
  const list = document.querySelector("#todoList");
  msg.textContent = "Carregando...";
  list.innerHTML = "";

  const { data, error } = await supabase
    .from("todos")
    .select("id, title, done, inserted_at")
    .order("inserted_at", { ascending: false });

  if (error) {
    msg.textContent = "Erro ao carregar.";
    console.error(error);
    return;
  }

  msg.textContent = "";

  for (const t of data) {
    const li = document.createElement("li");
    li.innerHTML = `
      <label class="todo">
        <input type="checkbox" ${t.done ? "checked" : ""} />
        <span class="${t.done ? "done" : ""}">${escapeHtml(t.title)}</span>
      </label>
      <button class="danger">Excluir</button>
    `;

    const checkbox = li.querySelector("input");
    const delBtn = li.querySelector("button");

    checkbox.addEventListener("change", async () => {
      const { error } = await supabase
        .from("todos")
        .update({ done: checkbox.checked })
        .eq("id", t.id);

      if (error) {
        console.error(error);
        checkbox.checked = !checkbox.checked;
        return;
      }
      await loadTodos();
    });

    delBtn.addEventListener("click", async () => {
      const { error } = await supabase.from("todos").delete().eq("id", t.id);
      if (error) {
        console.error(error);
        return;
      }
      await loadTodos();
    });

    list.appendChild(li);
  }
}

async function addTodo(title) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { error } = await supabase.from("todos").insert({
    user_id: session.user.id,
    title,
    done: false,
  });

  if (error) throw error;
}

function escapeHtml(str) {
  return str.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function bindEvents() {
  const authMsg = document.querySelector("#authMsg");
  const todoMsg = document.querySelector("#todoMsg");

  document.querySelector("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    authMsg.textContent = "";

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value.trim();

    try {
      await signIn(email, password);
      await refreshSessionUI();
    } catch (err) {
      authMsg.textContent = err.message;
    }
  });

  document.querySelector("#signupBtn").addEventListener("click", async () => {
    authMsg.textContent = "";

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value.trim();

    try {
      await signUp(email, password);
      authMsg.textContent = "Conta criada! Verifique seu email (se confirmação estiver ligada).";
    } catch (err) {
      authMsg.textContent = err.message;
    }
  });

  document.querySelector("#logoutBtn").addEventListener("click", async () => {
    todoMsg.textContent = "";
    try {
      await signOut();
      await refreshSessionUI();
    } catch (err) {
      todoMsg.textContent = err.message;
    }
  });

  document.querySelector("#todoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    todoMsg.textContent = "";

    const input = document.querySelector("#todoTitle");
    const title = input.value.trim();
    if (!title) return;

    try {
      await addTodo(title);
      input.value = "";
      await loadTodos();
    } catch (err) {
      todoMsg.textContent = err.message;
    }
  });

  supabase.auth.onAuthStateChange(() => {
    refreshSessionUI();
  });
}

ui();
bindEvents();
refreshSessionUI();
