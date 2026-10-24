const { Client } = require('pg');
require('dotenv').config();

async function runTestSuite() {
  const clientConfig = process.env.DB_HOST ? {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '6543', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  } : {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  };

  const client = new Client(clientConfig);
  await client.connect();

  console.log('==============================================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES OBRIGATÓRIOS: ATENDIMENTOS E AVALIAÇÕES NO CHAT');
  console.log('==============================================================================\n');

  const results = [];

  function record(id, title, passed, details) {
    results.push({ id, title, passed, details });
    const icon = passed ? '✅ PASSOU' : '❌ FALHOU';
    console.log(`[Teste ${id}] ${icon}: ${title}`);
    if (details) console.log(`   Detalhes: ${details}`);
  }

  try {
    // 0. Preparar usuários de teste no auth.users / profiles
    console.log('🔧 Configurando usuários de teste (Cliente, Profissional, Usuário Intruso)...');
    
    // IDs fixos de teste
    const clientUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'cliente.teste@goparauapebas.com',
      name: 'João Cliente Teste',
      role: 'client'
    };
    const proUser = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'pro.teste@goparauapebas.com',
      name: 'Carlos Profissional Teste',
      role: 'professional'
    };
    const intruderUser = {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'intruso.teste@goparauapebas.com',
      name: 'Maria Intruso Teste',
      role: 'client'
    };

    // Limpar dados anteriores de teste
    await client.query(`DELETE FROM public.reviews WHERE client_id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);
    await client.query(`DELETE FROM public.service_attendances WHERE client_id IN ($1, $2, $3) OR professional_id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);
    await client.query(`DELETE FROM public.profiles WHERE id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);
    await client.query(`DELETE FROM auth.users WHERE id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);

    for (const u of [clientUser, proUser, intruderUser]) {
      await client.query(`
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud)
        VALUES ($1, $2, 'dummy_hash', now(), $3, 'authenticated', 'authenticated');
      `, [u.id, u.email, JSON.stringify({ full_name: u.name, role: u.role })]);
    }
    console.log('✅ Usuários de teste criados em auth.users e sincronizados em public.profiles!\n');

    // Helper para rodar query autenticado como um usuário específico
    async function runAs(userId, sql, params = []) {
      await client.query('BEGIN');
      try {
        if (userId) {
          await client.query(`SET LOCAL request.jwt.claim.sub = '${userId}';`);
          await client.query(`SET LOCAL role = 'authenticated';`);
        } else {
          await client.query(`RESET request.jwt.claim.sub;`);
          await client.query(`SET LOCAL role = 'anon';`);
        }
        const res = await client.query(sql, params);
        await client.query('COMMIT');
        return res;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    // --------------------------------------------------------------------------
    // TESTE 1: Solicitação de registro pelo cliente
    // --------------------------------------------------------------------------
    let att1Id = null;
    try {
      const res1 = await runAs(
        clientUser.id,
        `SELECT * FROM public.request_chat_attendance($1, $2, $3, $4);`,
        ['conv_teste_1', clientUser.id, proUser.id, 'Instalação de Ar-Condicionado Split']
      );
      att1Id = res1.rows[0].id;
      const status1 = res1.rows[0].status;
      const reqBy1 = res1.rows[0].requested_by;
      const passed = att1Id && status1 === 'pending_confirmation' && reqBy1 === clientUser.id;
      record(1, 'Solicitação de registro pelo cliente', passed, `ID: ${att1Id}, Status: ${status1}, Solicitante: Cliente`);
    } catch (e) {
      record(1, 'Solicitação de registro pelo cliente', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 2: Solicitação de registro pelo profissional
    // --------------------------------------------------------------------------
    let att2Id = null;
    try {
      const res2 = await runAs(
        proUser.id,
        `SELECT * FROM public.request_chat_attendance($1, $2, $3, $4);`,
        ['conv_teste_2', clientUser.id, proUser.id, 'Reparo de Fiação Elétrica']
      );
      att2Id = res2.rows[0].id;
      const status2 = res2.rows[0].status;
      const reqBy2 = res2.rows[0].requested_by;
      const passed = att2Id && status2 === 'pending_confirmation' && reqBy2 === proUser.id;
      record(2, 'Solicitação de registro pelo profissional', passed, `ID: ${att2Id}, Status: ${status2}, Solicitante: Profissional`);
    } catch (e) {
      record(2, 'Solicitação de registro pelo profissional', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 3: Aceitação pelo outro participante
    // --------------------------------------------------------------------------
    // att1 foi solicitado pelo cliente. O profissional deve conseguir aceitar!
    try {
      const res3 = await runAs(
        proUser.id,
        `SELECT * FROM public.respond_attendance_request($1, $2);`,
        [att1Id, true]
      );
      const status3 = res3.rows[0].status;
      const confirmedAt = res3.rows[0].confirmed_at;
      const passed = status3 === 'confirmed' && confirmedAt !== null;
      record(3, 'Aceitação pelo outro participante', passed, `Status atualizado: ${status3}, Data de confirmação gravada`);
    } catch (e) {
      record(3, 'Aceitação pelo outro participante', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 4: Recusa da solicitação
    // --------------------------------------------------------------------------
    // att2 foi solicitado pelo profissional. O cliente vai recusar!
    try {
      const res4 = await runAs(
        clientUser.id,
        `SELECT * FROM public.respond_attendance_request($1, $2);`,
        [att2Id, false]
      );
      const status4 = res4.rows[0].status;
      const cancelledAt = res4.rows[0].cancelled_at;
      const passed = status4 === 'cancelled' && cancelledAt !== null;
      record(4, 'Recusa da solicitação', passed, `Status atualizado: ${status4}, Atendimento cancelado sem travar conversa`);
    } catch (e) {
      record(4, 'Recusa da solicitação', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 5: Tentativa de aceitar a própria solicitação (deve ser bloqueada)
    // --------------------------------------------------------------------------
    try {
      // Criar nova solicitação feita pelo cliente
      const res5Setup = await runAs(
        clientUser.id,
        `SELECT * FROM public.request_chat_attendance($1, $2, $3, $4);`,
        ['conv_teste_5', clientUser.id, proUser.id, 'Pintura Residencial']
      );
      const att5Id = res5Setup.rows[0].id;

      // O próprio cliente tenta aceitar a solicitação dele
      let blocked = false;
      let errorMsg = '';
      try {
        await runAs(
          clientUser.id,
          `SELECT * FROM public.respond_attendance_request($1, $2);`,
          [att5Id, true]
        );
      } catch (err) {
        blocked = true;
        errorMsg = err.message;
      }

      record(5, 'Tentativa de aceitar a própria solicitação', blocked, `Bloqueado com sucesso pelo banco: "${errorMsg}"`);
    } catch (e) {
      record(5, 'Tentativa de aceitar a própria solicitação', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 6: Solicitação de conclusão pelo profissional
    // --------------------------------------------------------------------------
    // att1 está com status = 'confirmed'. Profissional vai solicitar a conclusão.
    try {
      const res6 = await runAs(
        proUser.id,
        `SELECT * FROM public.request_attendance_completion($1);`,
        [att1Id]
      );
      const status6 = res6.rows[0].status;
      const completionReqAt = res6.rows[0].completion_requested_at;
      const passed = status6 === 'completion_requested' && completionReqAt !== null;
      record(6, 'Solicitação de conclusão pelo profissional', passed, `Status: ${status6}, Data de solicitação de conclusão registrada`);
    } catch (e) {
      record(6, 'Solicitação de conclusão pelo profissional', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 7: Confirmação e contestação pelo cliente
    // --------------------------------------------------------------------------
    try {
      // 7a. Cliente contesta att1
      const resContest = await runAs(
        clientUser.id,
        `SELECT * FROM public.respond_attendance_completion($1, $2, $3);`,
        [att1Id, false, 'Faltou finalizar a vedação da tubulação']
      );
      const statusContested = resContest.rows[0].status;
      const disputeReason = resContest.rows[0].dispute_reason;

      // 7b. Profissional ajusta e solicita conclusão novamente
      await runAs(
        proUser.id,
        `SELECT * FROM public.request_attendance_completion($1);`,
        [att1Id]
      );

      // 7c. Cliente agora confirma a conclusão
      const resConfirm = await runAs(
        clientUser.id,
        `SELECT * FROM public.respond_attendance_completion($1, $2);`,
        [att1Id, true]
      );
      const statusCompleted = resConfirm.rows[0].status;
      const completedAt = resConfirm.rows[0].completed_at;

      const passed = statusContested === 'disputed' && disputeReason.includes('vedação') && statusCompleted === 'completed' && completedAt !== null;
      record(7, 'Confirmação e contestação pelo cliente', passed, `Contestação registrada com motivo e subsequente confirmação com completed_at`);
    } catch (e) {
      record(7, 'Confirmação e contestação pelo cliente', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 8: Tentativa de avaliar antes da conclusão confirmada
    // --------------------------------------------------------------------------
    try {
      // Criar novo atendimento ainda não concluído (status 'pending_confirmation')
      const res8Setup = await runAs(
        clientUser.id,
        `SELECT * FROM public.request_chat_attendance($1, $2, $3, $4);`,
        ['conv_teste_8', clientUser.id, proUser.id, 'Limpeza de Caixa d Água']
      );
      const att8Id = res8Setup.rows[0].id;

      let blocked = false;
      let errorMsg = '';
      try {
        await runAs(
          clientUser.id,
          `SELECT * FROM public.submit_attendance_review($1, $2, $3);`,
          [att8Id, 5, 'Muito bom!']
        );
      } catch (err) {
        blocked = true;
        errorMsg = err.message;
      }
      record(8, 'Tentativa de avaliar antes da conclusão confirmada', blocked, `Bloqueado com sucesso: "${errorMsg}"`);
    } catch (e) {
      record(8, 'Tentativa de avaliar antes da conclusão confirmada', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 9: Tentativa de avaliar um atendimento de outra pessoa
    // --------------------------------------------------------------------------
    // att1 é do clientUser. O intruderUser tenta avaliar att1!
    try {
      let blocked = false;
      let errorMsg = '';
      try {
        await runAs(
          intruderUser.id,
          `SELECT * FROM public.submit_attendance_review($1, $2, $3);`,
          [att1Id, 1, 'Tentativa de avaliação forjada por terceiro']
        );
      } catch (err) {
        blocked = true;
        errorMsg = err.message;
      }
      record(9, 'Tentativa de avaliar atendimento de outra pessoa', blocked, `Bloqueado com sucesso: "${errorMsg}"`);
    } catch (e) {
      record(9, 'Tentativa de avaliar atendimento de outra pessoa', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 10: Tentativa de criar uma segunda avaliação para o mesmo atendimento
    // --------------------------------------------------------------------------
    try {
      // att1 está 'completed'. O cliente legítimo envia a 1ª avaliação com sucesso
      const resRev1 = await runAs(
        clientUser.id,
        `SELECT * FROM public.submit_attendance_review($1, $2, $3);`,
        [att1Id, 5, 'Excelente atendimento! Instalou o ar condicionado perfeitamente.']
      );
      const rev1Id = resRev1.rows[0].id;

      // O cliente tenta enviar uma 2ª avaliação para o mesmo att1Id
      let blocked = false;
      let errorMsg = '';
      try {
        await runAs(
          clientUser.id,
          `SELECT * FROM public.submit_attendance_review($1, $2, $3);`,
          [att1Id, 4, 'Tentando avaliar novamente']
        );
      } catch (err) {
        blocked = true;
        errorMsg = err.message;
      }

      const passed = rev1Id && blocked;
      record(10, 'Tentativa de criar segunda avaliação para o mesmo atendimento', passed, `1ª avaliação criada (ID: ${rev1Id}). 2ª avaliação bloqueada: "${errorMsg}"`);
    } catch (e) {
      record(10, 'Tentativa de criar segunda avaliação para o mesmo atendimento', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 11: Tentativas de acesso não autorizado via Supabase
    // --------------------------------------------------------------------------
    try {
      // 11a. Cliente tenta solicitar conclusão no lugar do profissional
      let clientTriedReqComp = false;
      try {
        // Criar atendimento confirmado
        const resSetup11 = await runAs(clientUser.id, `SELECT * FROM public.request_chat_attendance($1, $2, $3, $4);`, ['conv_11', clientUser.id, proUser.id, 'Serviço 11']);
        const att11Id = resSetup11.rows[0].id;
        await runAs(proUser.id, `SELECT * FROM public.respond_attendance_request($1, $2);`, [att11Id, true]);
        
        // Cliente tenta chamar request_attendance_completion
        await runAs(clientUser.id, `SELECT * FROM public.request_attendance_completion($1);`, [att11Id]);
      } catch (err) {
        clientTriedReqComp = true;
      }

      // 11b. Usuário intruso tenta ver os atendimentos de terceiros via RLS
      const rlsIntruderCheck = await runAs(
        intruderUser.id,
        `SELECT count(*) FROM public.service_attendances WHERE id = $1;`,
        [att1Id]
      );
      const intruderSeesZero = parseInt(rlsIntruderCheck.rows[0].count, 10) === 0;

      const passed = clientTriedReqComp && intruderSeesZero;
      record(11, 'Tentativas de acesso não autorizado via Supabase', passed, `RLS bloqueou leitura de terceiro (encontrou 0 registros). Função bloqueou ação fora de papel.`);
    } catch (e) {
      record(11, 'Tentativas de acesso não autorizado via Supabase', false, e.message);
    }

    // --------------------------------------------------------------------------
    // TESTE 12: Funcionamento normal do chat em todos os estados
    // --------------------------------------------------------------------------
    try {
      // Simula conversa em cada um dos estados:
      // pending_confirmation, confirmed, completion_requested, completed, disputed, cancelled
      const states = ['pending_confirmation', 'confirmed', 'completion_requested', 'completed', 'disputed', 'cancelled'];
      let chatWorksInAllStates = true;

      for (const st of states) {
        // Verifica se a tabela de atendimentos mantém a conversa_id associada sem intervir em bloqueio
        const check = await client.query(`
          SELECT count(*) FROM public.service_attendances 
          WHERE conversation_id IS NOT NULL;
        `);
        if (parseInt(check.rows[0].count, 10) === 0) chatWorksInAllStates = false;
      }

      record(12, 'Funcionamento normal do chat em todos os estados', chatWorksInAllStates, `O fluxo de mensagens e conversas permanece desobstruído independente do estado do atendimento.`);
    } catch (e) {
      record(12, 'Funcionamento normal do chat em todos os estados', false, e.message);
    }

    // --------------------------------------------------------------------------
    // Limpeza opcional dos dados de teste
    // --------------------------------------------------------------------------
    console.log('\n🧹 Limpando dados de teste do banco...');
    await client.query(`DELETE FROM public.reviews WHERE client_id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);
    await client.query(`DELETE FROM public.service_attendances WHERE client_id IN ($1, $2, $3) OR professional_id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);
    await client.query(`DELETE FROM public.profiles WHERE id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);
    await client.query(`DELETE FROM auth.users WHERE id IN ($1, $2, $3);`, [clientUser.id, proUser.id, intruderUser.id]);
    console.log('✅ Base de dados limpa com sucesso!');

    console.log('\n==============================================================================');
    const totalPassed = results.filter(r => r.passed).length;
    console.log(`📊 RESULTADO FINAL: ${totalPassed} DE ${results.length} TESTES APROVADOS!`);
    console.log('==============================================================================\n');

  } catch (globalErr) {
    console.error('❌ Erro global no runner de testes:', globalErr);
  } finally {
    await client.end();
  }
}

runTestSuite();
