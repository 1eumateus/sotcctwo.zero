<template>
  <RespostaOrientacao
    @modal:open="fecharNegarOrientacao($event)"
    :orientacao="orientacao"
    situacao="negado"
    :usuario="props.usuario"
    v-if="openNegarOrientacao"
  />
  <GerarCartaz
    :form="orientacao"
    @modal:open="openGerarCartaz = $event"
    v-if="openGerarCartaz"
  />
  <Videochamada
    :orientacao-id="orientacao._id"
    :usuario="props.usuario"
    :eh-professor="ehProfessor"
    :modo="modoVideochamada"
    @modal:open="openVideochamada = $event"
    v-if="openVideochamada"
  />
  <main class="flex-grow relative">
    <section class="mx-auto max-w-6xl p-[14px] flex flex-col gap-[14px]">
      <template v-if="!viewing">
        <div class="border-b border-secundaria-opaco pb-[8px] flex items-center justify-between flex-wrap gap-[8px]">
          <Texto as="h3" color="principal">
            {{ ehProfessor ? 'Progresso do aluno' : 'Seu progresso' }}
          </Texto>
          <div class="flex items-center gap-[12px]">
            <Texto as="body" color="gray" v-if="orientacao.aluno?.nome">
              {{
                ehProfessor
                  ? `Aluno: ${orientacao.aluno.nome} ${orientacao.aluno.sobrenome || ''}`
                  : `Orientador: ${orientacao.professor?.nome || ''} ${orientacao.professor?.sobrenome || ''}`
              }}
            </Texto>
            <button
              v-if="!acoesSuspensas && orientacao.situacao === 'confirmado'"
              type="button"
              :disabled="!ehProfessor && !salaReuniaoAtiva"
              :class="[
                'flex items-center gap-[4px] px-[10px] py-[6px] rounded-md font-bold text-[13px]',
                (ehProfessor || salaReuniaoAtiva)
                  ? 'cursor-pointer bg-principal hover:bg-principal-opaco text-white'
                  : 'cursor-not-allowed bg-secundaria border border-secundaria-opaco text-gray-400',
              ]"
              @click="modoVideochamada = orientacao.cartazGerado ? 'defesa' : 'reuniao'; openVideochamada = true"
            >
              <PhVideoCamera :size="16" />
              {{ orientacao.cartazGerado ? (ehProfessor ? 'Sala de defesa' : 'Entrar na sala de defesa') : (ehProfessor ? 'Criar reunião' : 'Entrar na reunião') }}
            </button>
            <button
              v-if="ehProfessor && !acoesSuspensas && orientacao.situacao === 'confirmado' && !orientacao.cartazGerado"
              type="button"
              class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] border border-principal text-principal hover:bg-secundaria rounded-md font-bold text-[13px]"
              @click="abrirAgendamentoReuniao"
            >
              <PhCalendarPlus :size="16" />
              {{ orientacao.reuniao?.agendadaPara && !orientacao.reuniao?.ativa ? 'Alterar agendamento' : 'Agendar' }}
            </button>
            <button
              v-if="!somenteLeitura && !cancelamentoAtivo && podeSolicitarCancelamento"
              type="button"
              class="cursor-pointer flex items-center gap-[4px] px-[10px] py-[6px] border border-red-300 text-red-600 hover:bg-red-50 rounded-md font-bold text-[13px]"
              @click="openNegarOrientacao = true"
            >
              <PhX :size="16" />
              {{ ehProfessor ? 'Encerrar orientação' : 'Solicitar cancelamento' }}
            </button>
          </div>
        </div>

        <div v-if="agendandoReuniao" class="border border-secundaria-opaco rounded-md bg-secundaria p-[12px] flex flex-wrap items-end gap-[10px]">
          <div class="w-[160px]">
            <Campo v-model="reuniaoAgendarData" label="Data" id="reuniaoData" type="date" :obrigatorio="true" />
          </div>
          <div class="w-[130px]">
            <Campo v-model="reuniaoAgendarHora" label="Hora" id="reuniaoHora" type="time" :obrigatorio="true" />
          </div>
          <button
            type="button"
            class="cursor-pointer bg-principal hover:bg-principal-opaco text-white px-[14px] py-[9px] rounded-md font-bold text-[13px]"
            @click="confirmarAgendamentoReuniao"
          >
            Confirmar
          </button>
          <button
            type="button"
            class="cursor-pointer border border-gray-300 hover:bg-gray-100 px-[14px] py-[9px] rounded-md font-bold text-[13px]"
            @click="agendandoReuniao = false"
          >
            Cancelar
          </button>
        </div>

        <div
          v-if="orientacao.reuniao?.agendadaPara && !orientacao.reuniao?.ativa && !orientacao.cartazGerado"
          class="border border-terciaria rounded-md bg-terciaria/10 p-[12px] flex items-center gap-[8px]"
        >
          <PhCalendarBlank :size="20" class="fill-terciaria-opaco flex-shrink-0" />
          <Texto as="body" color="gray">
            {{ ehProfessor ? 'Reunião marcada para' : 'Seu orientador marcou uma reunião para' }}
            {{ formatMask.viewDataHora(orientacao.reuniao.agendadaPara) }} - a sala libera sozinha nesse horário.
          </Texto>
        </div>

        <div v-if="somenteLeitura" class="border border-secundaria-opaco rounded-md bg-secundaria p-[12px] flex items-center gap-[8px]">
          <PhCheckCircle :size="20" class="fill-principal flex-shrink-0" />
          <Texto as="body-bold" color="principal">
            {{ situacaoEncerramento }}
          </Texto>
        </div>

        <div
          v-if="cancelamentoAtivo"
          class="border border-orange-300 bg-orange-50 rounded-md p-[12px] flex flex-col gap-[10px]"
        >
          <div class="flex items-start justify-between flex-wrap gap-[8px]">
            <div class="flex flex-col gap-[2px]">
              <Texto as="body-bold" color="orange">
                {{
                  cancelamentoSolicitadoPorMim
                    ? 'Cancelamento solicitado'
                    : (ehProfessor ? 'O aluno solicitou o cancelamento desta orientação' : 'O orientador solicitou o cancelamento desta orientação')
                }}
              </Texto>
              <Texto as="body">
                {{ orientacao.cancelamento.motivo }}
              </Texto>
            </div>
            <div class="flex gap-[8px]" v-if="!cancelamentoSolicitadoPorMim && !recusandoCancelamento">
              <button
                type="button"
                class="cursor-pointer px-[14px] py-[8px] bg-green-600 hover:bg-green-700 text-white rounded-md font-bold text-[13px]"
                @click="aceitarCancelamento"
              >
                Aceitar
              </button>
              <button
                type="button"
                class="cursor-pointer px-[14px] py-[8px] border border-gray-300 hover:bg-gray-100 rounded-md font-bold text-[13px]"
                @click="recusandoCancelamento = true"
              >
                Recusar
              </button>
            </div>
            <button
              v-else-if="cancelamentoSolicitadoPorMim"
              type="button"
              class="cursor-pointer px-[14px] py-[8px] border border-gray-300 hover:bg-gray-100 rounded-md font-bold text-[13px]"
              @click="retirarSolicitacaoCancelamento"
            >
              Retirar solicitação
            </button>
          </div>

          <div v-if="recusandoCancelamento" class="flex flex-col gap-[6px]">
            <Texto as="small" color="gray">Justifique a recusa</Texto>
            <textarea
              v-model="motivoRecusaCancelamento"
              rows="2"
              placeholder="Explique por que está recusando o cancelamento..."
              class="w-full border border-principal focus:outline-principal p-[8px] rounded-md text-sm bg-white"
            ></textarea>
            <div class="flex items-center gap-[10px]">
              <button
                type="button"
                class="cursor-pointer px-[14px] py-[8px] bg-principal hover:bg-principal-opaco text-white rounded-md font-bold text-[13px]"
                @click="recusarCancelamento"
              >
                Confirmar recusa
              </button>
              <button
                type="button"
                class="cursor-pointer text-[12px] font-bold text-gray-500 hover:underline"
                @click="recusandoCancelamento = false; motivoRecusaCancelamento = ''"
              >
                Cancelar
              </button>
            </div>
          </div>

          <Texto as="label" color="gray" v-if="cancelamentoSolicitadoPorMim">
            {{ ehProfessor ? 'Aguardando resposta do aluno.' : 'Aguardando resposta do orientador.' }}
          </Texto>
        </div>

        <div
          v-if="mostrarRespostaCancelamento"
          class="border border-orange-300 bg-orange-50 rounded-md p-[12px] flex flex-col gap-[6px]"
        >
          <div class="flex items-center justify-between gap-[8px]">
            <div class="flex items-center gap-[8px]">
              <PhCheckCircle v-if="orientacao.cancelamento.resposta.aceito" :size="20" class="fill-orange-500 flex-shrink-0" />
              <PhX v-else :size="20" class="fill-orange-500 flex-shrink-0" />
              <Texto as="body-bold" color="orange">
                {{ orientacao.cancelamento.resposta.aceito ? 'Cancelamento aceito' : 'Cancelamento recusado' }}
              </Texto>
            </div>
            <div class="flex items-center gap-[4px] flex-shrink-0">
              <PhClock :size="14" class="fill-orange-500" />
              <Texto as="small" color="orange">
                {{ tempoRestanteRespostaCancelamento }}
              </Texto>
            </div>
          </div>
          <Texto as="body" v-if="!orientacao.cancelamento.resposta.aceito">
            Motivo: {{ orientacao.cancelamento.resposta.motivo }}
          </Texto>
        </div>

        <div
          v-if="ehProfessor && tccConcluido && !orientacao.cartazGerado"
          class="border border-terciaria rounded-md bg-terciaria/10 p-[12px] flex items-center justify-between flex-wrap gap-[8px]"
        >
          <div class="flex items-center gap-[8px]">
            <PhFilePdf :size="20" class="fill-terciaria-opaco" />
            <Texto as="body-bold" color="principal">
              TCC concluído! Prepare o cartaz de divulgação da defesa.
            </Texto>
          </div>
          <button
            type="button"
            class="cursor-pointer flex items-center gap-[6px] px-[14px] py-[8px] bg-terciaria hover:bg-terciaria-opaco text-white rounded-md font-bold text-[13px]"
            @click="openGerarCartaz = true"
          >
            Gerar cartaz de divulgação
          </button>
        </div>

        <div
          v-if="!acoesSuspensas && orientacao.dataDefesa && orientacao.situacao === 'confirmado'"
          class="border border-terciaria rounded-md bg-terciaria/10 p-[12px] flex flex-col gap-[8px]"
        >
          <div class="flex items-center justify-between flex-wrap gap-[8px]">
            <div class="flex items-center gap-[8px]">
              <PhVideoCamera :size="20" class="fill-terciaria-opaco" />
              <Texto as="body-bold" color="principal">
                {{ ehDiaDaDefesa ? `Hoje é o dia d${ehProfessor ? 'a' : 'a sua'} defesa!` : 'Defesa agendada' }}
              </Texto>
            </div>
            <button
              v-if="!ehProfessor && ehDiaDaDefesa"
              type="button"
              class="cursor-pointer flex items-center gap-[6px] px-[14px] py-[8px] bg-terciaria hover:bg-terciaria-opaco text-white rounded-md font-bold text-[13px]"
              @click="modoVideochamada = 'defesa'; openVideochamada = true"
            >
              Entrar na sala
            </button>
            <button
              v-if="ehProfessor && orientacao.cartazGerado"
              type="button"
              class="cursor-pointer flex items-center gap-[6px] px-[14px] py-[8px] border border-terciaria text-terciaria-opaco hover:bg-terciaria/20 rounded-md font-bold text-[13px]"
              @click="openGerarCartaz = true"
            >
              <PhPencilSimple :size="14" />
              Editar dados do cartaz
            </button>
          </div>
          <div class="flex items-center gap-[4px]">
            <PhClock :size="16" class="fill-gray-600" />
            <Texto as="small" color="gray">
              {{ formatMask.viewDate(orientacao.dataDefesa) }}{{ orientacao.horaDefesa ? ` às ${orientacao.horaDefesa}` : '' }}
            </Texto>
          </div>
          <Texto as="small" color="gray" v-if="orientacao.banca?.length">
            Banca examinadora: {{ orientacao.banca.map((membro) => membro.instituicao ? `${membro.nome} (${membro.instituicao})` : membro.nome).join(', ') }}
          </Texto>
        </div>

        <template v-if="orientacao.fases?.length">
          <div class="flex items-start overflow-x-auto pb-[4px] mt-2">
            <template v-for="(fase, index) in orientacao.fases" :key="fase._id || index">
              <button
                type="button"
                :disabled="faseStatus(index) === 'locked'"
                class="flex flex-col items-center gap-[4px] flex-shrink-0 w-[92px] md:w-[120px] group"
                @click="abaSelecionada = index"
              >
                <span :class="noFaseClass(index)">
                  <PhCheck v-if="faseStatus(index) === 'completed'" :size="18" class="fill-white" />
                  <PhLockSimple v-else-if="faseStatus(index) === 'locked'" :size="16" class="fill-gray-400" />
                  <span v-else class="text-white font-bold text-[13px]">{{ index + 1 }}</span>
                </span>
                <Texto
                  as="small"
                  class="text-center leading-tight line-clamp-2"
                  :color="index === abaSelecionada ? 'principal' : 'gray'"
                >
                  {{ fase.nome }}
                </Texto>
              </button>
              <div
                v-if="index < orientacao.fases.length - 1"
                class="flex-1 h-[2px] mt-[19px] min-w-[16px]"
                :class="index < faseAtualIndex ? 'bg-principal' : 'bg-secundaria-opaco'"
              ></div>
            </template>
          </div>

          <div class="flex flex-col gap-[10px]">
            <div class="flex items-center justify-between flex-wrap gap-[8px]">
              <div class="flex items-center gap-[8px] flex-wrap">
                <Texto as="h4" color="principal">
                  Fase {{ abaSelecionada + 1 }}: {{ faseSelecionada.nome }}
                </Texto>
                <span
                  v-if="faseStatus(abaSelecionada) === 'current'"
                  class="text-xs font-bold px-[8px] py-[2px] rounded-full bg-terciaria text-white"
                >
                  Fase atual
                </span>
              </div>
              <span
                :class="`text-xs font-bold px-[8px] py-[2px] rounded-full ${faseSelecionada.situacao === 'aprovada' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`"
              >
                {{ faseSelecionada.situacao === 'aprovada' ? 'Aprovada' : 'Aguardando aprovação' }}
              </span>
            </div>

            <div class="flex items-center gap-[8px] flex-wrap border-t border-secundaria-opaco pt-[10px]">
              <Texto as="body-bold" color="principal">Prazo:</Texto>
              <template v-if="ehProfessor && !acoesSuspensas && editandoPrazo">
                <input
                  type="date"
                  v-model="prazoEditando"
                  class="text-[13px] border border-secundaria-opaco rounded-md px-[6px] py-[2px] focus:outline-principal"
                />
                <button
                  type="button"
                  class="cursor-pointer text-[12px] font-bold text-principal hover:underline"
                  @click="salvarPrazo"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  class="cursor-pointer text-[12px] font-bold text-gray-500 hover:underline"
                  @click="editandoPrazo = false"
                >
                  Cancelar
                </button>
              </template>
              <template v-else>
                <Texto as="label">
                  {{ faseSelecionada.prazo ? formatMask.viewDate(faseSelecionada.prazo) : 'Sem prazo definido' }}
                </Texto>
                <button
                  v-if="ehProfessor && !acoesSuspensas"
                  type="button"
                  class="cursor-pointer text-[12px] font-bold text-principal hover:underline"
                  @click="iniciarEdicaoPrazo"
                >
                  Editar
                </button>
              </template>
              <span
                v-if="faseAtrasada(abaSelecionada)"
                class="text-xs font-bold px-[8px] py-[2px] rounded-full bg-red-100 text-red-700"
              >
                Fase atrasada
              </span>
            </div>

            <div v-if="abaSelecionada === 0 || souFaseTema" class="flex flex-col gap-[6px] border-t border-secundaria-opaco pt-[10px]">
              <Texto as="body-bold" color="principal">{{ souFaseTema ? 'Tema do TCC' : 'Descrição da proposta' }}</Texto>
              <template v-if="!ehProfessor && !acoesSuspensas && faseSelecionada.situacao !== 'aprovada' && editandoDescricao">
                <textarea
                  v-model="descricaoProposta"
                  rows="3"
                  :placeholder="souFaseTema ? 'Digite o tema final do TCC, que será usado no cartaz de divulgação.' : 'Descreva sua ideia de TCC, referências, links úteis etc.'"
                  class="w-full border border-principal focus:outline-principal p-[8px] rounded-md text-sm"
                ></textarea>
                <div class="flex items-center gap-[10px]">
                  <button
                    type="button"
                    class="cursor-pointer self-start flex items-center gap-[6px] bg-principal hover:bg-principal-opaco text-white px-[14px] py-[8px] rounded-md font-bold text-[14px]"
                    @click="salvarDescricaoProposta"
                  >
                    <PhFloppyDisk :size="18" class="fill-white" />
                    {{ souFaseTema ? 'Salvar tema' : 'Salvar proposta' }}
                  </button>
                  <button
                    type="button"
                    class="cursor-pointer text-[12px] font-bold text-gray-500 hover:underline"
                    @click="editandoDescricao = false"
                  >
                    Cancelar
                  </button>
                </div>
              </template>
              <template v-else>
                <div class="w-full border border-secundaria-opaco rounded-md p-[8px]">
                  <Texto as="body" v-if="souFaseTema ? temaAtual : faseSelecionada.descricao">
                    <template v-for="(parte, i) in linkify(souFaseTema ? temaAtual : faseSelecionada.descricao)" :key="i">
                      <a v-if="parte.link" :href="parte.link" target="_blank" rel="noopener noreferrer" class="underline text-principal hover:text-principal-opaco break-all">{{ parte.texto }}</a>
                      <template v-else>{{ parte.texto }}</template>
                    </template>
                  </Texto>
                  <Texto as="label" color="gray" v-else>
                    {{ souFaseTema ? 'O aluno ainda não definiu o tema.' : 'O aluno ainda não descreveu a proposta.' }}
                  </Texto>
                </div>
                <button
                  v-if="!ehProfessor && !acoesSuspensas && faseSelecionada.situacao !== 'aprovada'"
                  type="button"
                  class="cursor-pointer self-start text-[12px] font-bold text-principal hover:underline"
                  @click="iniciarEdicaoDescricao"
                >
                  Editar
                </button>
              </template>
            </div>

            <div class="flex flex-col gap-[6px] border-t border-secundaria-opaco pt-[10px]">
              <Texto as="body-bold" color="principal">Arquivos</Texto>

              <div class="border border-secundaria-opaco rounded-md overflow-hidden" v-if="faseSelecionada.arquivos?.length > 0">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-secundaria border-b border-secundaria-opaco">
                      <th class="p-2 text-left">
                        <Texto as="small" color="gray">Nome</Texto>
                      </th>
                      <th class="p-2 text-left">
                        <Texto as="small" color="gray">Data</Texto>
                      </th>
                      <th class="p-2 text-center">
                        <Texto as="small" color="gray">Ações</Texto>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(arquivo, idx) in faseSelecionada.arquivos"
                      :key="arquivo._id"
                      class="even:bg-secundaria border-b border-secundaria last:border-b-0"
                    >
                      <td class="p-2">
                        <div class="flex items-center gap-[6px]">
                          <PhFilePdf :size="18" class="fill-principal" />
                          <span class="truncate max-w-[220px]" :title="arquivo.originalname">
                            {{ arquivo.originalname }}
                          </span>
                        </div>
                      </td>
                      <td class="p-2 text-xs text-gray-600">
                        {{ formatMask.viewDate(arquivo.dataEnvio) }}
                      </td>
                      <td class="p-2">
                        <div class="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            @click="viewPdf(arquivo)"
                            class="cursor-pointer p-[6px] border border-gray-300 hover:bg-secundaria rounded-md"
                            title="Visualizar"
                          >
                            <PhEye :size="16" class="fill-principal" />
                          </button>
                          <button
                            v-if="!ehProfessor && faseSelecionada.situacao !== 'aprovada' && idx === faseSelecionada.arquivos.length - 1"
                            type="button"
                            @click="removerArquivo(abaSelecionada, arquivo._id)"
                            class="cursor-pointer p-[6px] border border-gray-300 hover:bg-secundaria rounded-md"
                            title="Remover"
                          >
                            <PhTrash :size="16" class="fill-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Texto as="label" color="gray" v-else>
                Nenhum arquivo enviado nesta fase ainda.
              </Texto>

              <div
                v-if="!ehProfessor && !acoesSuspensas && faseSelecionada.situacao !== 'aprovada'"
                class="flex flex-col items-start gap-[6px]"
              >
                <label
                  for="upload"
                  class="cursor-pointer inline-flex items-center gap-2 bg-principal text-white px-[14px] py-[8px] rounded-md hover:bg-principal-opaco"
                >
                  <PhCloudArrowUp :size="18" class="fill-white" />
                  <Texto as="button" color="white">
                    Enviar PDF
                  </Texto>
                </label>
                <input
                  id="upload"
                  type="file"
                  accept=".pdf"
                  class="hidden"
                  @change="enviarArquivo($event, abaSelecionada)"
                />
                <Texto as="label" color="gray">
                  Você pode enviar quantos arquivos quiser. A fase avança quando o orientador aprovar.
                </Texto>
              </div>
            </div>

            <div class="flex flex-col gap-[8px] border-t border-secundaria-opaco pt-[10px]">
              <Texto as="body-bold" color="principal">
                Comentários
              </Texto>
              <div v-if="!faseSelecionada.comentarios?.length">
                <Texto as="label" color="gray">
                  Nenhum comentário ainda.
                </Texto>
              </div>
              <div
                v-for="comentario in faseSelecionada.comentarios"
                :key="comentario._id"
                class="group flex items-end gap-[8px]"
                :class="ehMeuComentario(comentario) ? 'flex-row' : 'flex-row-reverse'"
              >
                <div
                  class="relative flex items-center justify-center w-[28px] h-[28px] rounded-full text-white text-[12px] font-bold flex-shrink-0"
                  :class="comentario.autor === 'professor' ? 'bg-principal' : 'bg-terciaria'"
                  :title="nomeCompleto(comentario.autor === 'professor' ? orientacao.professor : orientacao.aluno)"
                >
                  {{ iniciais(comentario.autor === 'professor' ? orientacao.professor : orientacao.aluno) }}
                  <span v-if="comentarioNaoLido(comentario)" class="absolute -top-[2px] -right-[2px] w-[8px] h-[8px] rounded-full bg-red-500 border border-white"></span>
                </div>

                <div class="max-w-[75%] flex flex-col gap-[4px]" :class="ehMeuComentario(comentario) ? 'items-start' : 'items-end'">
                  <Texto as="small" color="gray" class="px-[2px]">
                    {{ nomeCompleto(comentario.autor === 'professor' ? orientacao.professor : orientacao.aluno) }}
                  </Texto>
                  <div
                    class="rounded-md p-[8px] flex flex-col gap-[4px] border w-full"
                    :class="[
                      comentario.autor === 'professor' ? 'bg-secundaria border-secundaria-opaco' : 'bg-terciaria/10 border-terciaria/30',
                      ehMeuComentario(comentario) ? 'rounded-bl-none' : 'rounded-br-none',
                      comentarioNaoLido(comentario) ? 'ring-2 ring-terciaria' : '',
                    ]"
                  >
                    <template v-if="comentarioEditando === comentario._id">
                      <textarea
                        v-model="comentarioEdicaoTexto"
                        rows="2"
                        class="w-full border border-principal focus:outline-principal p-[6px] rounded-md text-sm bg-white"
                      ></textarea>
                      <div class="flex items-center gap-[10px]">
                        <button type="button" @click="salvarEdicaoComentario(abaSelecionada, comentario._id)" class="cursor-pointer text-[12px] font-bold text-principal hover:underline">
                          Salvar
                        </button>
                        <button type="button" @click="comentarioEditando = null" class="cursor-pointer text-[12px] font-bold text-gray-500 hover:underline">
                          Cancelar
                        </button>
                      </div>
                    </template>
                    <template v-else>
                      <Texto as="body">
                        <template v-for="(parte, i) in linkify(comentario.texto)" :key="i">
                          <a v-if="parte.link" :href="parte.link" target="_blank" rel="noopener noreferrer" class="underline text-principal hover:text-principal-opaco break-all">{{ parte.texto }}</a>
                          <template v-else>{{ parte.texto }}</template>
                        </template>
                      </Texto>
                      <button
                        v-if="comentario.anexo"
                        type="button"
                        @click="viewPdf(comentario.anexo)"
                        :title="comentario.anexo.originalname"
                        class="cursor-pointer self-start flex items-center gap-[6px] px-[8px] py-[4px] bg-white hover:bg-gray-100 border border-gray-300 rounded-md text-xs max-w-[220px]"
                      >
                        <PhFilePdf :size="14" class="fill-principal flex-shrink-0" />
                        <span class="truncate">{{ comentario.anexo.originalname }}</span>
                      </button>
                      <div class="flex items-center gap-[4px] self-end">
                        <Texto as="small" color="gray" v-if="comentario.editado">editado ·</Texto>
                        <Texto as="small" color="gray">{{ formatMask.viewDate(comentario.data) }}</Texto>
                      </div>
                    </template>
                  </div>

                  <div
                    v-if="ehMeuComentario(comentario) && !acoesSuspensas && comentarioEditando !== comentario._id"
                    class="flex items-center gap-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button type="button" @click="iniciarEdicaoComentario(comentario)" title="Editar comentário" class="cursor-pointer text-gray-400 hover:text-principal">
                      <PhPencilSimple :size="13" />
                    </button>
                    <button type="button" @click="removerComentario(abaSelecionada, comentario._id)" title="Excluir comentário" class="cursor-pointer text-gray-400 hover:text-red-600">
                      <PhTrash :size="13" />
                    </button>
                  </div>
                </div>
              </div>

              <template v-if="!acoesSuspensas">
                <textarea
                  ref="comentarioTextareaRef"
                  v-model="comentarioTexto[abaSelecionada]"
                  rows="2"
                  placeholder="Escreva um comentário..."
                  class="w-full border border-principal focus:outline-principal p-[8px] rounded-md text-sm resize-none overflow-hidden"
                  @input="aoDigitarComentario"
                ></textarea>
                <div
                  v-if="comentarioAnexo[abaSelecionada]"
                  class="flex items-center gap-[6px] text-xs text-gray-600 bg-gray-100 border border-gray-300 rounded-md px-[8px] py-[4px] w-fit"
                >
                  <PhFilePdf :size="14" class="fill-principal flex-shrink-0" />
                  <span class="truncate max-w-[160px]">{{ comentarioAnexo[abaSelecionada].name }}</span>
                  <button type="button" @click="comentarioAnexo[abaSelecionada] = null" class="cursor-pointer text-gray-500 hover:text-red-600">
                    <PhX :size="12" />
                  </button>
                </div>
                <div class="flex items-center gap-[8px] flex-wrap">
                  <button
                    type="button"
                    @click="enviarComentario(abaSelecionada)"
                    class="cursor-pointer border border-gray-300 hover:bg-gray-200 px-[14px] py-[8px] rounded-md font-bold text-[14px]"
                  >
                    Enviar comentário
                  </button>
                  <label
                    :for="`anexoComentario-${abaSelecionada}`"
                    title="Anexar arquivo ao comentário"
                    class="cursor-pointer flex items-center justify-center p-[9px] border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-principal rounded-md"
                  >
                    <PhPaperclip :size="16" />
                  </label>
                  <input
                    :id="`anexoComentario-${abaSelecionada}`"
                    type="file"
                    accept=".pdf"
                    class="hidden"
                    @change="selecionarAnexoComentario($event, abaSelecionada)"
                  />
                  <button
                    v-if="ehProfessor && faseSelecionada.situacao !== 'aprovada'"
                    type="button"
                    @click="aprovarFase(abaSelecionada)"
                    :disabled="!faseSelecionada.arquivos?.length"
                    class="cursor-pointer bg-principal hover:bg-principal-opaco disabled:opacity-50 disabled:cursor-not-allowed text-white px-[14px] py-[8px] rounded-md font-bold text-[14px] flex items-center gap-1"
                  >
                    <PhCheck :size="18" class="fill-white" />
                    Aprovar fase
                  </button>
                </div>
              </template>
            </div>
          </div>
        </template>

        <div
          v-if="!acoesSuspensas && orientacao.fases?.length && faseAtualIndex >= orientacao.fases.length"
          class="border border-secundaria-opaco rounded-md bg-white p-[24px] flex flex-col items-center gap-[6px]"
        >
          <PhCheckCircle :size="40" class="fill-principal" />
          <Texto as="h4" color="principal">
            Todas as fases foram concluídas!
          </Texto>
          <button
            v-if="ehProfessor"
            type="button"
            class="cursor-pointer flex items-center gap-[6px] mt-[8px] px-[14px] py-[8px] bg-principal hover:bg-principal-opaco text-white rounded-md font-bold text-[13px]"
            @click="concluirOrientacao"
          >
            <PhCheckCircle :size="18" class="fill-white" />
            Concluir orientação
          </button>
          <Texto as="label" color="gray" v-else>
            Aguardando o orientador concluir a orientação.
          </Texto>
        </div>
      </template>

      <template v-else>
        <div class="flex items-center justify-between gap-[12px] flex-wrap border-b border-secundaria-opaco pb-[8px]">
          <div class="flex items-center gap-[12px]">
            <button
              @click="closePdfViewer"
              type="button"
              class="cursor-pointer flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-200 px-[12px] py-[8px] rounded-md text-black font-normal"
            >
              <PhCaretLeft :size="18" />
              voltar
            </button>
            <div class="flex items-center gap-[6px]">
              <PhFilePdf :size="22" class="fill-principal" />
              <Texto as="h4" color="principal">
                {{ selectedFile?.originalname || "Visualizador PDF" }}
              </Texto>
            </div>
          </div>

          <div class="flex items-center gap-[10px]">
            <PhMagnifyingGlass :size="18" class="fill-gray-600" />
            <input
              type="range"
              v-model.number="zoomLevel"
              min="0.5"
              max="1.5"
              step="0.01"
              class="w-32 h-1 rounded-lg appearance-none cursor-pointer zoom-slider"
              :style="{
                background: `linear-gradient(to right, #3d4a7b 0%, #3d4a7b ${(zoomLevel - 0.5) * 100}%, #e9e9e9 ${(zoomLevel - 0.5) * 100}%, #e9e9e9 100%)`,
              }"
            />
            <Texto as="label" color="gray" class="min-w-[45px]">
              {{ Math.round(zoomLevel * 100) }}%
            </Texto>
            <button
              @click="resetZoom"
              type="button"
              class="cursor-pointer text-xs border border-gray-300 hover:bg-gray-200 px-[10px] py-[6px] rounded-md transition-colors"
              title="Resetar zoom"
            >
              Resetar
            </button>
          </div>
        </div>

        <div class="h-[75vh] border border-secundaria-opaco rounded-md overflow-auto">
          <PdfViewer
            ref="pdfViewerRef"
            :key="selectedPdfUrl"
            :pdfUrl="selectedPdfUrl"
            :zoomLevel="zoomLevel"
          />
        </div>
      </template>
    </section>
  </main>
</template>

<script setup>
import { onMounted, onUnmounted, nextTick, reactive, ref, computed, watch, defineAsyncComponent } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  PhTrash, PhEye, PhCloudArrowUp, PhFilePdf, PhMagnifyingGlass,
  PhCaretLeft, PhCheck, PhCheckCircle, PhLockSimple, PhLockSimpleOpen, PhX, PhPaperclip, PhPencilSimple, PhFloppyDisk, PhClock, PhVideoCamera,
  PhCalendarBlank, PhCalendarPlus,
} from '@phosphor-icons/vue';
import Texto from '@components/Texto.vue';
import Campo from '@components/Campo.vue';
const PdfViewer = defineAsyncComponent(() => import("../../components/pdfViewer.vue"));
import RespostaOrientacao from './RespostaOrientacao.vue';
import GerarCartaz from './GerarCartaz.vue';
import Videochamada from './Videochamada.vue';
import api from "@/api.js";
import { popupInfo, formatMask, notificarNavegador } from '../../stores/util.js';
import { useLoaderState } from "../../stores/isLoading.js";

const props = defineProps({
  usuario: {
    type: [Object],
    required: false,
  },
});

const route = useRoute();
const router = useRouter();
const openNegarOrientacao = ref(false);
const openGerarCartaz = ref(false);
const openVideochamada = ref(false);
const modoVideochamada = ref('reuniao'); // 'reuniao' (sala nova por clique) | 'defesa' (sala fixa do cartaz)
const agendandoReuniao = ref(false);
const reuniaoAgendarData = ref('');
const reuniaoAgendarHora = ref('');
const recusandoCancelamento = ref(false);
const motivoRecusaCancelamento = ref('');
const isLoading = useLoaderState();
const urlApi = import.meta.env.VITE_URL;

const ehProfessor = computed(() => props.usuario?.tipo === 'professor');

// depois do cartaz gerado, o botão de reunião vira "Sala de defesa" e passa a
// usar a mesma sala fixa da defesa - a sala já é pública (link no cartaz), o
// aluno não precisa mais esperar o professor "abrir" pra poder entrar.
const salaReuniaoAtiva = computed(() => (
  orientacao.cartazGerado ? true : !!orientacao.reuniao?.ativa
));

const somenteLeitura = computed(() => orientacao.ativo === false);

// pendente de verdade = tem solicitadoPor e ainda não foi respondido. Depois
// de respondido, o cancelamento continua no objeto só pra exibir o aviso
// (mostrarRespostaCancelamento) por 24h, sem travar mais nada.
const cancelamentoAtivo = computed(() => !!orientacao.cancelamento?.solicitadoPor && !orientacao.cancelamento?.resposta?.data);

// ponytail: enquanto há cancelamento pendente, todo o resto some (upload,
// comentário, prazo, aprovar) - a mesma suspensão que o backend já aplica.
const acoesSuspensas = computed(() => somenteLeitura.value || cancelamentoAtivo.value);

// ponytail: sem esse "tick" o computed só recalcula quando outra coisa muda
// (poll, ação) - com ele, o aviso some sozinho ao completar 24h e a contagem
// regressiva atualiza a cada minuto.
const agora = ref(Date.now());
let tickInterval = null;

const mostrarRespostaCancelamento = computed(() => {
  const resposta = orientacao.cancelamento?.resposta;
  if (!resposta?.data) return false;
  return agora.value - new Date(resposta.data).getTime() < 24 * 60 * 60 * 1000;
});

const tempoRestanteRespostaCancelamento = computed(() => {
  const resposta = orientacao.cancelamento?.resposta;
  if (!resposta?.data) return '';
  const restanteMs = 24 * 60 * 60 * 1000 - (agora.value - new Date(resposta.data).getTime());
  if (restanteMs <= 0) return '';
  const horas = Math.floor(restanteMs / (60 * 60 * 1000));
  const minutos = Math.floor((restanteMs % (60 * 60 * 1000)) / (60 * 1000));
  if (horas > 0) return `Este aviso some em ${horas}h ${minutos}min.`;
  return `Este aviso some em ${minutos}min.`;
});

const situacaoEncerramento = computed(() => {
  if (orientacao.situacao === 'concluido') return 'Esta orientação foi concluída.';
  if (orientacao.situacao === 'cancelado') return 'Esta orientação foi cancelada.';
  if (orientacao.situacao === 'negado') return 'Esta solicitação foi negada.';
  return 'Esta orientação foi encerrada.';
});

const orientacao = reactive({
  _id: null,
  situacao: '',
  aluno: {},
  professor: {},
  fases: [],
});

const comentarioTexto = reactive({});
const comentarioAnexo = reactive({});
const comentarioEditando = ref(null);
const comentarioEdicaoTexto = ref('');
const abaSelecionada = ref(0);

const faseSelecionada = computed(() => orientacao.fases[abaSelecionada.value] || {});
// o aluno define o tema na Pré-defesa e ainda pode ajustar na Versão final
// (antes do cartaz ser gerado de vez). Guarda sempre na descrição da
// Pré-defesa — a aba de Versão final é só outra porta de entrada pro mesmo
// campo, não um tema separado.
const indiceFaseTema = computed(() => orientacao.fases.findIndex((f) => f.nome === 'Pré-defesa'));
const souFaseTema = computed(() => {
  const fase = orientacao.fases?.[abaSelecionada.value];
  return fase?.nome === 'Pré-defesa' || abaSelecionada.value === orientacao.fases.length - 1;
});
const temaAtual = computed(() => orientacao.fases?.[indiceFaseTema.value]?.descricao || '');

const prazoEditando = ref('');
const editandoPrazo = ref(false);
const descricaoProposta = ref('');
const editandoDescricao = ref(false);

// ponytail: watch na aba, não na fase — a fase muda de referência a cada poll
// (10s) mesmo sem alteração real, e resetava os campos/edições em andamento.
watch(abaSelecionada, () => {
  const fase = faseSelecionada.value;
  prazoEditando.value = fase?.prazo ? formatMask.date(fase.prazo) : '';
  descricaoProposta.value = souFaseTema.value ? temaAtual.value : (fase?.descricao || '');
  editandoPrazo.value = false;
  editandoDescricao.value = false;
  // a caixa de comentário é uma só reaproveitada entre as abas - ao trocar de
  // aba o texto muda sem disparar "input", então a altura fica do tamanho do
  // comentário da aba anterior se não recalcular aqui.
  nextTick(() => redimensionarComentario());
}, { immediate: true });

const comentarioTextareaRef = ref(null);

function redimensionarComentario() {
  const el = comentarioTextareaRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

// cresce a caixa junto com o texto e desce a tela na mesma medida que ela
// cresceu, pra quem está digitando não perder a caixa (e o botão "Enviar")
// de vista conforme o comentário fica mais longo.
function aoDigitarComentario(event) {
  const alturaAntes = event.target.offsetHeight;
  redimensionarComentario();
  const crescimento = event.target.offsetHeight - alturaAntes;
  // instantâneo, não 'smooth' - a caixa já cresceu na hora (reflow síncrono),
  // um scroll suave atrasado faz o conteúdo abaixo "sumir" por um instante
  // até a rolagem alcançar o tamanho novo.
  if (crescimento > 0) window.scrollBy({ top: crescimento, behavior: 'auto' });
}

const selectedFile = ref(null);
const viewing = ref(false);
const zoomLevel = ref(1.0);
const pdfViewerRef = ref(null);

const selectedPdfUrl = computed(() =>
  selectedFile.value ? `${urlApi}/uploads/${selectedFile.value.filename}` : null
);

const faseAtualIndex = computed(() => {
  if (!orientacao.fases?.length) return 0;
  const idx = orientacao.fases.findIndex((f) => f.situacao !== 'aprovada');
  return idx === -1 ? orientacao.fases.length : idx;
});

const podeSolicitarCancelamento = computed(() => faseAtualIndex.value <= 1);

const tccConcluido = computed(() => !!orientacao.fases?.length && faseAtualIndex.value === orientacao.fases.length);

const ehDiaDaDefesa = computed(() => {
  if (!orientacao.dataDefesa) return false;
  return formatMask.date(orientacao.dataDefesa) === formatMask.date(new Date());
});

const cancelamentoSolicitadoPorMim = computed(() => {
  const solicitadoPor = orientacao.cancelamento?.solicitadoPor;
  return (solicitadoPor === 'aluno' && !ehProfessor.value) || (solicitadoPor === 'professor' && ehProfessor.value);
});

function faseStatus(index) {
  if (index < faseAtualIndex.value) return 'completed';
  if (index === faseAtualIndex.value) return 'current';
  return 'locked';
}

function noFaseClass(index) {
  const status = faseStatus(index);
  const base = 'w-[36px] h-[36px] rounded-full flex items-center justify-center flex-shrink-0 transition-all ';
  let cor = 'bg-secundaria border-2 border-secundaria-opaco cursor-not-allowed';
  if (status === 'completed') cor = 'bg-principal border-2 border-principal cursor-pointer';
  if (status === 'current') {
    cor = faseAtrasada(index)
      ? 'bg-red-600 border-2 border-red-700 shadow-md cursor-pointer'
      : 'bg-terciaria border-2 border-terciaria shadow-md cursor-pointer';
  }
  const selecionada = index === abaSelecionada.value ? ' ring-2 ring-offset-2 ring-principal' : '';
  return base + cor + selecionada;
}

function faseAtrasada(index) {
  const fase = orientacao.fases?.[index];
  if (!fase?.prazo || fase.situacao === 'aprovada') return false;
  return new Date(fase.prazo) < new Date();
}

const dataDesdeSnapshot = ref(null);

function faseComNovidade() {
  const meuAutor = ehProfessor.value ? 'professor' : 'aluno';
  const dataDesde = dataDesdeSnapshot.value || new Date(0);
  for (let i = 0; i < orientacao.fases.length; i++) {
    const fase = orientacao.fases[i];
    if (ehProfessor.value) {
      for (const arquivo of fase.arquivos || []) {
        if (new Date(arquivo.dataEnvio) > dataDesde) return i;
      }
    }
    for (const comentario of fase.comentarios || []) {
      if (comentario.autor !== meuAutor && new Date(comentario.data) > dataDesde) return i;
    }
  }
  return null;
}

function comentarioNaoLido(comentario) {
  const meuAutor = ehProfessor.value ? 'professor' : 'aluno';
  if (comentario.autor === meuAutor || !dataDesdeSnapshot.value) return false;
  return new Date(comentario.data) > dataDesdeSnapshot.value;
}

function ehMeuComentario(comentario) {
  return comentario.autor === (ehProfessor.value ? 'professor' : 'aluno');
}

function nomeCompleto(pessoa) {
  return `${pessoa?.nome || ''} ${pessoa?.sobrenome || ''}`.trim() || (pessoa === orientacao.professor ? 'Orientador' : 'Aluno');
}

function iniciais(pessoa) {
  const sobrenome = pessoa?.sobrenome ? pessoa.sobrenome.charAt(0) : '';
  return pessoa?.nome ? (pessoa.nome.charAt(0) + sobrenome).toUpperCase() : '?';
}

function linkify(texto) {
  if (!texto) return [];
  return texto.split(/(https?:\/\/[^\s]+)/g).filter(Boolean).map((parte) => ({
    texto: parte,
    link: /^https?:\/\//.test(parte) ? parte : null,
  }));
}

let primeiraCarga = true;

async function start() {
  isLoading.changeStateTrue();
  await api.get(`/orientacao/${route.params.id}`)
    .then(async (res) => {
      Object.assign(orientacao, res.data.orientacao);
      orientacao.dataDefesa = formatMask.date(orientacao.dataDefesa);
      if (!orientacao.coorientador) orientacao.coorientador = { nome: '', instituicao: '' };
      if (!orientacao.banca) orientacao.banca = [];
      if (primeiraCarga) {
        const desde = ehProfessor.value ? orientacao.ultimaVisualizacaoProfessor : orientacao.ultimaVisualizacaoAluno;
        dataDesdeSnapshot.value = desde ? new Date(desde) : new Date(0);
        const novidade = faseComNovidade();
        abaSelecionada.value = novidade ?? Math.min(faseAtualIndex.value, orientacao.fases.length - 1);
        primeiraCarga = false;
      }
      // ponytail: sem o await aqui, quem navega rápido (ex.: clica e já volta
      // pra Home) podia sair da página antes desse PUT terminar - o sino do
      // menu ficava aceso mesmo já tendo "lido", até o poll de 20s alcançar.
      await api.put(`/orientacao/${orientacao._id}/visualizar`)
        .then(() => window.dispatchEvent(new Event('sotcc:notificacao-vista')))
        .catch(() => {});
    })
    .catch((e) => {
      popupInfo().warning(e.response?.data?.msg || 'Orientação não encontrada.');
      router.push({ name: 'Home' });
    });
  isLoading.changeStateFalse();
}

async function enviarArquivo(event, faseIndex) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf') {
    return popupInfo().warning('Selecione um arquivo PDF.');
  }
  const formData = new FormData();
  formData.append('arquivo', file);
  isLoading.changeStateTrue();
  await api.post(`/orientacao/${orientacao._id}/fases/${faseIndex}/arquivo`, formData)
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao enviar arquivo.'))
    .finally(() => isLoading.changeStateFalse());
}

async function removerArquivo(faseIndex, arquivoId) {
  isLoading.changeStateTrue();
  await api.delete(`/orientacao/${orientacao._id}/fases/${faseIndex}/arquivo/${arquivoId}`)
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao remover arquivo.'))
    .finally(() => isLoading.changeStateFalse());
}

async function aprovarFase(faseIndex) {
  isLoading.changeStateTrue();
  await api.put(`/orientacao/${orientacao._id}/fases/${faseIndex}/avaliar`, {
    texto: comentarioTexto[faseIndex] || '',
  })
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      comentarioTexto[faseIndex] = '';
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao aprovar fase.'))
    .finally(() => isLoading.changeStateFalse());
}

async function concluirOrientacao() {
  isLoading.changeStateTrue();
  await api.put(`/orientacao/${orientacao._id}/concluir`)
    .then((res) => {
      popupInfo().success(res.data?.msg);
      router.push({ name: 'Home' });
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao concluir orientação.'))
    .finally(() => isLoading.changeStateFalse());
}

function iniciarEdicaoPrazo() {
  prazoEditando.value = faseSelecionada.value?.prazo ? formatMask.date(faseSelecionada.value.prazo) : '';
  editandoPrazo.value = true;
}

async function salvarPrazo() {
  isLoading.changeStateTrue();
  await api.put(`/orientacao/${orientacao._id}/fases/${abaSelecionada.value}/prazo`, {
    prazo: prazoEditando.value || null,
  })
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      editandoPrazo.value = false;
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao definir prazo.'))
    .finally(() => isLoading.changeStateFalse());
}

function selecionarAnexoComentario(event, faseIndex) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  if (file.type !== 'application/pdf') {
    return popupInfo().warning('Selecione um arquivo PDF.');
  }
  comentarioAnexo[faseIndex] = file;
}

function iniciarEdicaoComentario(comentario) {
  comentarioEditando.value = comentario._id;
  comentarioEdicaoTexto.value = comentario.texto;
}

async function salvarEdicaoComentario(faseIndex, comentarioId) {
  if (!comentarioEdicaoTexto.value?.trim()) {
    return popupInfo().warning('Escreva um comentário.');
  }
  isLoading.changeStateTrue();
  await api.put(`/orientacao/${orientacao._id}/fases/${faseIndex}/comentario/${comentarioId}`, {
    texto: comentarioEdicaoTexto.value,
  })
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      comentarioEditando.value = null;
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao editar comentário.'))
    .finally(() => isLoading.changeStateFalse());
}

async function removerComentario(faseIndex, comentarioId) {
  isLoading.changeStateTrue();
  await api.delete(`/orientacao/${orientacao._id}/fases/${faseIndex}/comentario/${comentarioId}`)
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao remover comentário.'))
    .finally(() => isLoading.changeStateFalse());
}

function iniciarEdicaoDescricao() {
  descricaoProposta.value = souFaseTema.value ? temaAtual.value : (faseSelecionada.value?.descricao || '');
  editandoDescricao.value = true;
}

async function salvarDescricaoProposta() {
  isLoading.changeStateTrue();
  const indiceDestino = souFaseTema.value ? indiceFaseTema.value : abaSelecionada.value;
  await api.put(`/orientacao/${orientacao._id}/fases/${indiceDestino}/descricao`, {
    descricao: descricaoProposta.value,
  })
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      editandoDescricao.value = false;
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao salvar descrição.'))
    .finally(() => isLoading.changeStateFalse());
}

async function enviarComentario(faseIndex) {
  if (!comentarioTexto[faseIndex]?.trim()) {
    return popupInfo().warning('Escreva um comentário.');
  }
  const formData = new FormData();
  formData.append('texto', comentarioTexto[faseIndex]);
  if (comentarioAnexo[faseIndex]) {
    formData.append('anexo', comentarioAnexo[faseIndex]);
  }
  isLoading.changeStateTrue();
  await api.post(`/orientacao/${orientacao._id}/fases/${faseIndex}/comentario`, formData)
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      comentarioTexto[faseIndex] = '';
      comentarioAnexo[faseIndex] = null;
      nextTick(() => redimensionarComentario());
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || 'Erro ao enviar comentário.'))
    .finally(() => isLoading.changeStateFalse());
}

function viewPdf(arquivo) {
  selectedFile.value = arquivo;
  viewing.value = true;
  zoomLevel.value = 1.0;
  // a tela do PDF é bem mais curta que a de acompanhamento - se a página
  // estava rolada pra baixo (ex.: depois de digitar um comentário longo), o
  // botão "voltar" nasce fora da área visível e parece que não responde.
  window.scrollTo({ top: 0 });
}

function closePdfViewer() {
  selectedFile.value = null;
  viewing.value = false;
  zoomLevel.value = 1.0;
  window.scrollTo({ top: 0 });
}

function resetZoom() {
  zoomLevel.value = 1.0;
}

async function fecharNegarOrientacao(event) {
  openNegarOrientacao.value = event;
  await start();
  if (orientacao.situacao !== 'confirmado') {
    popupInfo().info('Orientação encerrada.');
    router.push({ name: 'Home' });
  }
}

async function aceitarCancelamento() {
  isLoading.changeStateTrue();
  await api.put(`/orientacao/${orientacao._id}/responderCancelamento`, { aceitar: true })
    .then((res) => {
      popupInfo().success(res.data?.msg);
      window.dispatchEvent(new Event('sotcc:notificacao-vista'));
      router.push({ name: 'Home' });
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || e))
    .finally(() => isLoading.changeStateFalse());
}

async function recusarCancelamento() {
  if (!motivoRecusaCancelamento.value?.trim()) {
    return popupInfo().warning('Justifique o motivo da recusa.');
  }
  isLoading.changeStateTrue();
  await api.put(`/orientacao/${orientacao._id}/responderCancelamento`, {
    aceitar: false,
    motivo: motivoRecusaCancelamento.value,
  })
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      recusandoCancelamento.value = false;
      motivoRecusaCancelamento.value = '';
      window.dispatchEvent(new Event('sotcc:notificacao-vista'));
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || e))
    .finally(() => isLoading.changeStateFalse());
}

async function retirarSolicitacaoCancelamento() {
  isLoading.changeStateTrue();
  await api.put(`/orientacao/${orientacao._id}/retirarCancelamento`)
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      window.dispatchEvent(new Event('sotcc:notificacao-vista'));
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || e))
    .finally(() => isLoading.changeStateFalse());
}

// reabre o formulário já preenchido com o que está marcado - o professor
// pode alterar data/hora só sobrescrevendo e confirmando de novo.
function abrirAgendamentoReuniao() {
  const agendada = orientacao.reuniao?.agendadaPara;
  if (agendada && !orientacao.reuniao?.ativa) {
    const data = new Date(agendada);
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    reuniaoAgendarData.value = `${ano}-${mes}-${dia}`;
    reuniaoAgendarHora.value = `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
  }
  agendandoReuniao.value = !agendandoReuniao.value;
}

async function confirmarAgendamentoReuniao() {
  if (!reuniaoAgendarData.value || !reuniaoAgendarHora.value) {
    return popupInfo().warning('Informe data e hora da reunião.');
  }
  isLoading.changeStateTrue();
  await api.post(`/orientacao/${orientacao._id}/reuniao/agendar`, {
    data: reuniaoAgendarData.value,
    hora: reuniaoAgendarHora.value,
  })
    .then(async (res) => {
      popupInfo().success(res.data?.msg);
      agendandoReuniao.value = false;
      reuniaoAgendarData.value = '';
      reuniaoAgendarHora.value = '';
      await start();
    })
    .catch((e) => popupInfo().warning(e.response?.data?.msg || e))
    .finally(() => isLoading.changeStateFalse());
}

// ponytail: sem infra de push (service worker/VAPID); polling + Notification API
// avisa quem está com a página aberta. Se precisar avisar com o app
// fechado, aí sim vale montar push de verdade.
let pollInterval = null;

function notificarNovoPrazo(fase, prazoAntigo, prazoNovo) {
  if (String(prazoAntigo || '') === String(prazoNovo || '')) return;
  const texto = prazoNovo
    ? `Novo prazo para "${fase.nome}": ${formatMask.viewDate(prazoNovo)}`
    : `O prazo da fase "${fase.nome}" foi removido.`;
  notificarNavegador('SOTCC - Prazo atualizado', texto);
}

function notificarNovaDescricao(fase, descricaoAntiga, descricaoNova) {
  if (!descricaoNova?.trim() || descricaoAntiga === descricaoNova) return;
  notificarNavegador('SOTCC - Proposta atualizada', `O aluno atualizou a descrição da proposta na fase "${fase.nome}".`);
}

function notificarNovoComentario(fase, comentario) {
  const autorLabel = comentario.autor === 'professor' ? 'O orientador' : 'O aluno';
  notificarNavegador('SOTCC - Novo comentário', `${autorLabel} comentou na fase "${fase.nome}".`);
}

function notificarNovoArquivo(fase, arquivo) {
  notificarNavegador('SOTCC - Novo arquivo', `O aluno enviou "${arquivo.originalname}" na fase "${fase.nome}".`);
}

function notificarFaseAprovada(fase) {
  notificarNavegador('SOTCC - Fase aprovada', `O orientador aprovou a fase "${fase.nome}".`);
}

function notificarRespostaCancelamento(resposta) {
  const texto = resposta.aceito
    ? 'Seu pedido de cancelamento foi aceito. A orientação foi encerrada.'
    : `Seu pedido de cancelamento foi recusado. Motivo: ${resposta.motivo}`;
  notificarNavegador('SOTCC - Resposta ao cancelamento', texto);
}

// depois do cartaz a sala já está sempre liberada pro aluno (não tem mais um
// "iniciar" pra notificar) - só a reunião avulsa (antes do cartaz) tem esse
// evento de verdade.
function salaAtivaDe(dados) {
  return dados.cartazGerado ? true : !!dados.reuniao?.ativa;
}

function notificarChamadaIniciada(cartazGerado) {
  const texto = cartazGerado
    ? 'O orientador abriu a sala de defesa. Você já pode entrar.'
    : 'O orientador criou uma reunião. Você já pode entrar.';
  notificarNavegador('SOTCC - Reunião', texto);
}

async function verificarMudancasFase() {
  const meuAutor = ehProfessor.value ? 'professor' : 'aluno';
  const tinhaRespostaCancelamento = !!orientacao.cancelamento?.resposta?.data;
  const salaAtivaAntes = salaAtivaDe(orientacao);
  const agendadaParaAntes = orientacao.reuniao?.agendadaPara || null;
  const antes = orientacao.fases.map((fase) => ({
    prazo: fase.prazo,
    descricao: fase.descricao,
    situacao: fase.situacao,
    totalComentarios: fase.comentarios?.length || 0,
    totalArquivos: fase.arquivos?.length || 0,
  }));
  await api.get(`/orientacao/${route.params.id}`)
    .then((res) => {
      const novaResposta = res.data.orientacao.cancelamento?.resposta;
      if (novaResposta?.data && !tinhaRespostaCancelamento && orientacao.cancelamento?.solicitadoPor === (ehProfessor.value ? 'professor' : 'aluno')) {
        notificarRespostaCancelamento(novaResposta);
      }
      const salaAtivaDepois = salaAtivaDe(res.data.orientacao);
      if (!ehProfessor.value && !salaAtivaAntes && salaAtivaDepois) {
        notificarChamadaIniciada(res.data.orientacao.cartazGerado);
      }
      const agendadaParaDepois = res.data.orientacao.reuniao?.agendadaPara || null;
      if (!ehProfessor.value && !res.data.orientacao.reuniao?.ativa && agendadaParaDepois && agendadaParaDepois !== agendadaParaAntes) {
        notificarNavegador('SOTCC - Reunião marcada', `O orientador marcou uma reunião para ${formatMask.viewDataHora(agendadaParaDepois)}.`);
      }
      if (!ehProfessor.value && salaAtivaAntes && !salaAtivaDepois && openVideochamada.value) {
        // ponytail: se o professor encerra pelo próprio Jitsi (sem passar
        // pelo botão "fechar" do modal), o aluno fica preso numa sala morta
        // até o próximo poll - fecha o modal dele junto.
        openVideochamada.value = false;
        notificarNavegador('SOTCC - Reunião', 'O orientador encerrou a sala.');
      }
      const fasesNovas = res.data.orientacao.fases || [];
      fasesNovas.forEach((fase, index) => {
        const anterior = antes[index];
        if (!anterior) return;
        if (!ehProfessor.value) notificarNovoPrazo(fase, anterior.prazo, fase.prazo);
        if (ehProfessor.value) notificarNovaDescricao(fase, anterior.descricao, fase.descricao);
        if (!ehProfessor.value && anterior.situacao !== 'aprovada' && fase.situacao === 'aprovada') {
          notificarFaseAprovada(fase);
        }

        (fase.comentarios || []).slice(anterior.totalComentarios)
          .filter((comentario) => comentario.autor !== meuAutor)
          .forEach((comentario) => notificarNovoComentario(fase, comentario));

        if (ehProfessor.value) {
          (fase.arquivos || []).slice(anterior.totalArquivos)
            .forEach((arquivo) => notificarNovoArquivo(fase, arquivo));
        }
      });
      const dadosNovos = { ...res.data.orientacao };
      if (openGerarCartaz.value) {
        // ponytail: enquanto o cartaz está aberto, não sobrescreve os campos
        // que o formulário edita — senão o poll apaga o que a pessoa digitou.
        delete dadosNovos.tema;
        delete dadosNovos.coorientador;
        delete dadosNovos.dataDefesa;
        delete dadosNovos.horaDefesa;
        delete dadosNovos.local;
        delete dadosNovos.presencial;
        delete dadosNovos.link;
        delete dadosNovos.banca;
      }
      Object.assign(orientacao, dadosNovos);
    })
    .catch(() => {});
}

function verificarMudancasFaseSeVisivel() {
  if (document.visibilityState === 'visible') verificarMudancasFase();
}

onMounted(async () => {
  await start();
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  pollInterval = setInterval(verificarMudancasFase, 10000);
  // ponytail: tabs em segundo plano têm o setInterval limitado pelo navegador;
  // reconferir ao focar cobre o caso comum de testar trocando de aba.
  document.addEventListener('visibilitychange', verificarMudancasFaseSeVisivel);
  tickInterval = setInterval(() => { agora.value = Date.now(); }, 60000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
  if (tickInterval) clearInterval(tickInterval);
  document.removeEventListener('visibilitychange', verificarMudancasFaseSeVisivel);
});
</script>

<style scoped>
button {
  cursor: pointer;
  transition: all 0.2s ease;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zoom-slider {
  -webkit-appearance: none;
  appearance: none;
}

.zoom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  background: #3d4a7b;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.zoom-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.zoom-slider:focus {
  outline: none;
}
</style>
